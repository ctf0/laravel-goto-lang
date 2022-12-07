'use strict'

import escapeStringRegexp from 'escape-string-regexp';
import { pascalcase } from 'pascalcase';
import {
    commands,
    DocumentSymbol,
    env,
    Range,
    Selection,
    TextEditorRevealType,
    Uri,
    window,
    workspace
} from 'vscode';

export const cmndName = 'lgl.openFile'
const scheme = `command:${cmndName}`

const fs = require('fs-extra')
const glob = require('fast-glob')
const path = require('path')
const sep = path.sep
const exec = require('await-exec')

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
    let list = checkCache(cache_store, fullKey)

    if (!list.length) {
        let internal = getDocFullPath(defaultPath)
        let char = '::'

        if (text.includes(char)) {
            text = text.split(char)
            let vendor = text[0]
            let key = text[1]

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

    if (!key.includes(' ')) {
        let fileList = key.split('.')

        result = fileList.length > 1
            ? await phpFilePattern(path, fileList)
            : await jsonFilePattern(path, key, fullKey)
    } else {
        result = await jsonFilePattern(path, key, fullKey)
    }

    return result
}

async function phpFilePattern(path, fileList) {
    let info = fileList.slice(1).join('.')
    fileList.pop()

    let toCheck = []
    while (fileList.length > 0) {
        toCheck.push(`**/${fileList.join(sep)}.php`)
        fileList.pop()
    }

    let result = await glob(toCheck, { cwd: path })
    let data = []

    for (const file of result) {
        let sepFile = `${sep}${file}`
        let fullPath = normalizePath(`${path}${sep}${file}`)
        let url = getDocFullPath(path, false) + `${sepFile}`

        let val = await getLangValue(fullPath, info, url, false)
        let args = prepareArgs({ path: fullPath, query: encodeURI(info) });

        data.push({
            tooltip: val ? `${val} (${url})` : url,
            fileUri: Uri.parse(`${scheme}?${args}`)
        })
    }

    return data
}

async function jsonFilePattern(path, key, fullKey) {
    let result = await glob('*.json', { cwd: path })
    let data = []

    for (const file of result) {
        let sepFile = `${sep}${file}`
        let fullPath = normalizePath(`${path}${sepFile}`)
        let url = getDocFullPath(path, false) + `${sepFile}`

        let val = await getLangValue(fullPath, fullKey, url, true)
        let args = prepareArgs({ path: fullPath, query: encodeURI(key), fragment: 'json' });

        data.push({
            tooltip: val ? `${val} (${url})` : url,
            fileUri: Uri.parse(`${scheme}?${args}`)
        })
    }

    return data
}

function prepareArgs(args: object) {
    return encodeURIComponent(JSON.stringify([args]));
}

function normalizePath(path) {
    return path
        .replace(/\/+/g, '/')
        .replace(/\+/g, '\\')
}

function getDocFullPath(path, add = true) {
    return add
        ? `${ws}${path}`.replace(/[\\\/]/g, sep)
        : path.replace(`${ws}${sep}`, '')
}

/* Lang Values ------------------------------------------------------------------- */
let cache_store_lang_keys = []

async function getLangValue(filePath, key_text, cache_key, isJson = false) {
    if (config.showValueOnHover) {
        let val = ''
        let cacheData = cache_store_lang_keys.find((file) => file.name == cache_key)

        if (cacheData) {
            val = cacheData.dataList[key_text]
        }

        if (!val) {
            try {
                let fileData = ''

                if (isJson) {
                    fileData = await fs.readJson(filePath)
                } else {
                    let res = await exec(`${config.phpCommand} -r 'print json_encode(include("${filePath}"));'`, {
                        cwd: ws,
                        shell: env.shell
                    })

                    fileData = JSON.parse(res.stdout)
                }

                if (cacheData) {
                    cacheData.dataList = fileData
                } else {
                    cache_store_lang_keys.push({
                        name: cache_key,
                        dataList: fileData
                    })
                }

                val = fileData[key_text]
            } catch (error) {
                // console.error(error)
            }
        }

        return val
    }
}

/* Scroll ------------------------------------------------------------------- */
export function scrollToText(args) {
    if (args !== undefined) {
        let { path, query, fragment } = args
        query = decodeURI(query)

        commands.executeCommand('vscode.open', Uri.file(path))
            .then(async () => {
                let editor = window.activeTextEditor
                let range: Range = await getTextPosition(query, editor.document, fragment)

                if (range) {
                    editor.selection = new Selection(range.start, range.end)
                    editor.revealRange(range, TextEditorRevealType.InCenter)
                }

                if (!range && query) {
                    window.showInformationMessage(
                        'Laravel Goto Lang: Copy Key Name To Clipboard',
                        ...['Copy']
                    ).then((e) => {
                        if (e) {
                            env.clipboard.writeText(
                                fragment !== undefined
                                    ? query
                                    : `'${query}' => `
                            )
                        }
                    })
                }
            })
    }
}

async function getTextPosition(query, document, isJson) {
    let symbols: DocumentSymbol[] = await commands.executeCommand("vscode.executeDocumentSymbolProvider", document.uri)

    if (query.includes('.') && isJson === undefined) {
        query = query.split('.')

        if (query.length > 1) {
            return getRange(symbols, query)
        } else {
        }
    }

    return symbols.find((symbol) => symbol.name == query)?.location.range
}

function getRange(symbolsList: Array<any>, keysArray: string[]): any {
    let key: any = null

    while (keysArray.length) {
        key = keysArray.shift()
        let node = symbolsList.find((symbol: any) => symbol.name === key)

        if (node) {
            if (node.children && keysArray.length) {
                return getRange(node.children, keysArray)
            }

            return node.location.range
        }

        break
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
            key: text,
            val: val
        })

    return val
}

/* Config ------------------------------------------------------------------- */
export const PACKAGE_NAME = 'laravelGotoLang'
export let methods: any = ''
let config: any = ''
let defaultPath: string = ''
let vendorPath: any = []

export function readConfig() {
    config = workspace.getConfiguration(PACKAGE_NAME)
    methods = config.methods.map((e) => escapeStringRegexp(e)).join('|')
    defaultPath = config.defaultPath
    vendorPath = config.vendorPath
}
