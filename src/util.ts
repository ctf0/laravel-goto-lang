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

const glob = require('fast-glob')
const pascalcase = require('pascalcase')

export async function getFilePaths(text, document) {
    text = text.replace(/(^['"]|['"]$)/g, '')
    let internal = getDocFullPath(document, defaultPath)

    if (text.includes('::')) {
        text = text.split('::')
        let vendor = text[0]
        let key = text[1]

        let list: any = await Promise.all(
            vendorPath
                .map((item) => {
                    return getData(
                        document,
                        getDocFullPath(document, item).replace('*', pascalcase(vendor)),
                        key
                    )
                })
                .concat(await getData(document, `${internal}/vendor/${vendor}`, key))
        )

        return list.flat()
    }

    return getData(document, internal, text)
}

async function getData(document, path, text) {
    let result
    let editor = `${env.uriScheme}://file`

    if (!text.includes(' ')) {
        let fileList = text.split('.')

        result = fileList.length > 1
            ? await phpFilePattern(document, path, editor, fileList)
            : await jsonFilePattern(document, path, editor, text)
    } else {
        result = await jsonFilePattern(document, path, editor, text)
    }

    return result
}

async function phpFilePattern(doc, path, editor, list) {
    let info = list.slice(1).join('.')
    list.pop()

    let toCheck = []
    while (list.length > 0) {
        toCheck.push(`**/${list.join('/')}.php`)
        list.pop()
    }

    let result = await glob(toCheck, {cwd: path})

    return result.map((file) => {
        return {
            tooltip : getDocFullPath(doc, path, false) + `/${file}`,
            fileUri : Uri
                .parse(`${editor}${path}/${file}`)
                .with({authority: 'ctf0.laravel-goto-lang', query: info})
        }
    })
}

async function jsonFilePattern(doc, path, editor, text) {
    let result = await glob('*.json', {cwd: path})

    return result.map((file) => {
        return {
            tooltip : getDocFullPath(doc, path, false) + `/${file}`,
            fileUri : Uri
                .parse(`${editor}${path}/${file}`)
                .with({authority: 'ctf0.laravel-goto-lang', query: text, fragment: 'json'})
        }
    })
}

function getDocFullPath(doc, path, add = true) {
    let ws = workspace.getWorkspaceFolder(doc.uri)?.uri.fsPath

    return add
        ? path.replace('$base', ws)
        : path.replace(`${ws}/`, '')
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
                        }, 800)
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
export let methods: any = ''

let defaultPath: string = ''
let vendorPath: any = []

export function readConfig() {
    let config = workspace.getConfiguration(PACKAGE_NAME)
    methods = config.methods.map((e) => escapeStringRegexp(e)).join('|')
    defaultPath = config.defaultPath
    vendorPath = config.vendorPath
}
