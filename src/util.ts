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

const glob               = require('fast-glob')
const path               = require('path')
const sep                = path.sep
const pascalcase         = require('pascalcase')
const exec               = require('await-exec')
const escapeStringRegexp = require('escape-string-regexp')

let ws

export function setWs(uri) {
    ws = workspace.getWorkspaceFolder(uri)?.uri.fsPath
}

/* -------------------------------------------------------------------------- */

let cache_store = []

export async function getFilePaths(text) {
    text = text.replace(/(^['"]|['"]$)/g, '')

    if (text.endsWith('.')) {
        return []
    }

    let fullKey = text
    let list    = checkCache(cache_store, fullKey)

    if (!list.length) {
        let internal = getDocFullPath(defaultPath)
        let char     = '::'

        if (text.includes(char)) {
            text       = text.split(char)
            let vendor = text[0]
            let key    = text[1]

            list = await Promise.all(
                vendorPath
                    .map((item) => {
                        return getData(
                            getDocFullPath(item).replace('*', pascalcase(vendor)),
                            key,
                            fullKey
                        )
                    })
                    .concat(await getData(`${internal}${sep}vendor${sep}${vendor}`, key, fullKey))
            )

            list = list.flat()
        } else {
            list = await getData(internal, text, fullKey)
        }

        if (list.length) {
            saveCache(cache_store, fullKey, list)
        }
    }

    return list
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
        toCheck.push(`**/${list.join(sep)}.php`)
        list.pop()
    }

    let result = await glob(toCheck, {cwd: path})
    let data   = []

    for (const file of result) {
        let val = await getLangValue(file, fullKey)
        let url = getDocFullPath(path, false) + `${sep}${file}`
        let normalizedPath = editor + normalizePath(`${path}${sep}${file}`)

        data.push({
            tooltip : val ? `${val} (${url})` : url,
            fileUri : Uri
                .parse(normalizedPath)
                .with({authority: 'ctf0.laravel-goto-lang', query: encodeURI(info)})
        })
    }

    return data
}

function normalizePath(path)
{
    return path
            .replace(/\/+/g, '/')
            .replace(/\+/g, '\\')
}

async function jsonFilePattern(path, editor, key, fullKey) {
    let result = await glob('*.json', {cwd: path})
    let data   = []

    for (const file of result) {
        let val = await getLangValue(file, fullKey)
        let url = getDocFullPath(path, false) + `${sep}${file}`
        let normalizedPath = editor + normalizePath(`${path}${sep}${file}`)

        data.push({
            tooltip : val ? `${val} (${url})` : url,
            fileUri : Uri
                .parse(normalizedPath)
                .with({authority: 'ctf0.laravel-goto-lang', query: encodeURI(key), fragment: 'json'})
        })
    }

    return data
}

function getDocFullPath(path, add = true) {
    return add
        ? `${ws}${path}`.replace(/[\\\/]/g, sep)
        : path.replace(`${ws}${sep}`, '')
}

/* Tinker ------------------------------------------------------------------- */
let counter            = 1
let cache_store_tinker = []

async function getLangValue(file, fullKey) {
    if (config.showValueOnHover) {
        let timer
        let locale = path.parse(file).name
        let key    = `trans('${fullKey}', [], '${locale}')`
        let list   = checkCache(cache_store_tinker, key)

        if (!list || !list.length) {
            try {
                let res = await exec(`${phpCommand} tinker --execute="echo ${key}"`, {
                    cwd   : ws,
                    shell : env.shell
                })

                list = res.stdout.replace(/<.*/, '').trim().replace(/['"]/g, '')

                saveCache(cache_store_tinker, key, list)
            } catch (error) {
                // console.error(error)

                if (counter >= 3) {
                    return clearTimeout(timer)
                }

                timer = setTimeout(() => {
                    counter++
                    getLangValue(file, fullKey)
                }, 2000)
            }
        }

        return list
    }
}

/* Scroll ------------------------------------------------------------------- */
export function scrollToText() {
    window.registerUriHandler({
        handleUri(provider) {
            let {authority, path, query, fragment} = provider
            query                                  = decodeURI(query)

            if (authority == 'ctf0.laravel-goto-lang') {
                commands.executeCommand('vscode.open', Uri.file(path))
                    .then(() => {
                        setTimeout(() => {
                            let editor = window.activeTextEditor
                            let range  = getTextPosition(query, editor.document, fragment)

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
        let arr   = searchFor.split('.')
        let last  = arr[arr.length - 1]
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

/* Helpers ------------------------------------------------------------------ */

function checkCache(cache_store, text) {
    let check = cache_store.find((e) => e.key == text)

    return check ? check.val : []
}

function saveCache(cache_store, text, val) {
    checkCache(cache_store, text).length
        ? false
        : cache_store.push({
            key : text,
            val : val
        })

    return val
}

/* Config ------------------------------------------------------------------- */
export const PACKAGE_NAME = 'laravelGotoLang'
let config: any = ''
export let methods: any = ''
let defaultPath: string = ''
let vendorPath: any = []
let phpCommand: string = ''

export function readConfig() {
    config      = workspace.getConfiguration(PACKAGE_NAME)
    methods     = config.methods.map((e) => escapeStringRegexp(e)).join('|')
    defaultPath = config.defaultPath
    vendorPath = config.vendorPath
    phpCommand = config.phpCommand
}
