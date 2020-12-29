'use strict'

import {
    commands,
    env,
    Range,
    Selection,
    Uri,
    window,
    workspace
} from 'vscode'

const glob       = require('fast-glob')
const path       = require('path')
const pascalcase = require('pascalcase')
const exec       = require('await-exec')

let ws = null
let cache = []

export async function getFilePaths(text, document) {
    ws = workspace.getWorkspaceFolder(document.uri)?.uri.fsPath

    text = text.replace(/(^['"]|['"]$)/g, '')
    let fullKey = text
    let internal = getDocFullPath(defaultPath)

    if (text.includes('::')) {
        text = text.split('::')
        let vendor = text[0]
        let key = text[1]

        let list: any = await Promise.all(
            vendorPath
                .map((item) => {
                    return getData(
                        getDocFullPath(item).replace('*', pascalcase(vendor)),
                        key,
                        fullKey
                    )
                })
                .concat(await getData(`${internal}/vendor/${vendor}`, key, fullKey))
        )

        return list.flat()
    }

    return getData(internal, text, fullKey)
}

async function getData(path, key, fullKey) {
    let result
    let editor = `${env.uriScheme}://file`

    if (!key.includes(' ')) {
        let fileList = key.split('.')

        result = fileList.length > 1
            ? await phpFilePattern(path, editor, fileList, fullKey)
            : await jsonFilePattern(path, editor, key, fullKey)
    } else {
        result = await jsonFilePattern(path, editor, key, fullKey)
    }

    return result
}

async function phpFilePattern(path, editor, list, fullKey) {
    let info = list.slice(1).join('.')
    list.pop()

    let toCheck = []
    while (list.length > 0) {
        toCheck.push(`**/${list.join('/')}.php`)
        list.pop()
    }

    let result = await glob(toCheck, {cwd: path})
    let data = []

    for (const file of result) {
        let val = await getLangValue(file, fullKey)
        let url = getDocFullPath(path, false) + `/${file}`

        data.push({
            tooltip : val ? `${val} "${url}"` : url,
            fileUri : Uri
                .parse(`${editor}${path}/${file}`)
                .with({authority: 'ctf0.laravel-goto-lang', query: info})
        })
    }

    return data
}

async function jsonFilePattern(path, editor, key, fullKey) {
    let result = await glob('*.json', {cwd: path})
    let data = []

    for (const file of result) {
        let val = await getLangValue(file, fullKey)
        let url = getDocFullPath(path, false) + `/${file}`

        data.push({
            tooltip : val ? `${val} "${url}"` : url,
            fileUri : Uri
                .parse(`${editor}${path}/${file}`)
                .with({authority: 'ctf0.laravel-goto-lang', query: key, fragment: 'json'})
        })
    }

    return data
}

function getDocFullPath(path, add = true) {
    return add
        ? path.replace('$base', ws)
        : path.replace(`${ws}/`, '')
}

/* Tinker ------------------------------------------------------------------- */
let counter = 1

async function getLangValue(file, fullKey) {
    if (config.showValueOnHover) {
        let timer
        let locale = path.parse(file).name
        let key = `trans('${fullKey}', [], '${locale}')`
        let cached = cache.find((e) => e.key == key)

        if (!cached) {
            try {
                let res = await exec(`php artisan tinker --execute="echo ${key}"`, {
                    cwd   : ws,
                    shell : env.shell
                })

                let data = res.stdout.replace(/<.*/, '').trim()

                cache.push({
                    key : key,
                    val : data
                })

                return data
            } catch (error) {
                console.error(error)

                if (counter >= 5) {
                    return clearTimeout(timer)
                }

                timer = setTimeout(() => {
                    counter++
                    getLangValue(file, fullKey)
                }, 2000)
            }
        }

        return cached.val
    }
}

/* Scroll ------------------------------------------------------------------- */
export function scrollToText() {
    window.registerUriHandler({
        handleUri(provider) {
            let {authority, path, query, fragment} = provider

            if (authority == 'ctf0.laravel-goto-lang') {
                commands.executeCommand('vscode.openFolder', Uri.file(path))
                    .then(() => {
                        setTimeout(() => {
                            let editor = window.activeTextEditor
                            let range = getTextPosition(query, editor.document, fragment)

                            if (range) {
                                editor.selection = new Selection(range.start, range.end)
                                editor.revealRange(range, 1)
                            }

                            if (!range && query) {
                                window.showInformationMessage(
                                    'Laravel Goto Lang: Copy Key Name To Clipboard',
                                    ...['Copy']
                                ).then((e) => {
                                    if (e) {
                                        env.clipboard.writeText(`'${query}' => `)
                                    }
                                })
                            }
                        }, config.waitB4Scroll)
                    })
            }
        }
    })
}

function getTextPosition(searchFor, doc, isJson) {
    let txt = doc.getText()
    let match

    if (isJson || searchFor.includes(' ')) {
        match = new RegExp(`['"]${searchFor}['"].*:`).exec(txt)
    } else if (searchFor.includes('.')) {
        let arr = searchFor.split('.')
        let last = arr[arr.length - 1]
        let regex = ''

        for (const item of arr) {
            regex += item == last
                ? `${item}.*=>`
                : `['"]${item}.*\\[([\\S\\s]*?)`
        }

        match = new RegExp(regex).exec(txt)
    } else {
        match = new RegExp(`['"]${searchFor}['"].*=>`).exec(txt)
    }


    if (match) {
        let pos = doc.positionAt(match.index + match[0].length)

        return new Range(pos, pos)
    }
}

/* Config ------------------------------------------------------------------- */
const escapeStringRegexp = require('escape-string-regexp')
export const PACKAGE_NAME = 'laravelGotoLang'
let config: any = ''
export let methods: any = ''

let defaultPath: string = ''
let vendorPath: any = []

export function readConfig() {
    config = workspace.getConfiguration(PACKAGE_NAME)
    methods = config.methods.map((e) => escapeStringRegexp(e)).join('|')
    defaultPath = config.defaultPath
    vendorPath = config.vendorPath
}
