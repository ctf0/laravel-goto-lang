'use strict'

import {
    workspace,
    Uri,
    env,
    Range,
    window,
    commands,
    Selection
} from 'vscode'

const glob = require("fast-glob")

export async function getFilePaths(text, document) {
    let info = text.replace(/['"]/g, '')
    let langPath = '/resources/lang'

    if (info.includes("::")) {
        let searchFor = info.split('::')
        langPath = `${langPath}/vendor/${searchFor[0]}`
        info = searchFor[1]
    }

    return getData(document, langPath, info)
}

async function getData(document, path, list) {
    let result
    let workspaceFolder = workspace.getWorkspaceFolder(document.uri).uri.fsPath
    let editor = `${env.uriScheme}://file`

    if (list.includes('.')) {
        let fileList = list.split('.')
        let info = fileList.slice(1).join('.')
        fileList.pop()

        let toCheck = []
        while (fileList.length > 0) {
            toCheck.push(`**/${fileList.join('/')}.php`)
            fileList.pop()
        }

        result = await glob(toCheck, { cwd: `${workspaceFolder}${path}` })
        result = result.map((item) => {
            return {
                "showPath": item,
                fileUri: Uri
                    .parse(`${editor}${workspaceFolder}${path}/${item}`)
                    .with({ authority: 'ctf0.laravel-goto-lang', query: info })
            }
        })
    } else {
        result = await glob('*.json', { cwd: `${workspaceFolder}${path}` })
        result = result.map((item) => {
            return {
                "showPath": item,
                fileUri: Uri
                    .parse(`${editor}${workspaceFolder}${path}/${item}`)
                    .with({ authority: 'ctf0.laravel-goto-lang', query: list, fragment: 'json' })
            }
        })
    }

    return result
}

/* Scroll ------------------------------------------------------------------- */
export function scrollToText() {
    window.registerUriHandler({
        handleUri(uri) {
            let { authority, path, query, fragment } = uri

            if (authority == 'ctf0.laravel-goto-lang') {
                commands.executeCommand('vscode.openFolder', Uri.file(path))
                    .then(() => {
                        setTimeout(() => {
                            let editor = window.activeTextEditor
                            let range = getTextPosition(query, editor.document, fragment)

                            if (range) {
                                editor.selection = new Selection(range.start, range.end)
                                editor.revealRange(range, 2)
                            }
                        }, 150)
                    })
            }
        }
    })
}

function getTextPosition(searchFor, doc, isJson) {
    let txt = doc.getText()
    let match

    if (searchFor.includes('.')) {
        let arr = searchFor.split('.')
        let last = arr[arr.length - 1]
        let regex = ''

        for (const item of arr) {
            regex += item == last
                ? `(?<found>${item}).*=>`
                : `['"]${item}.*\\[([\\S\\s]*?)`
        }

        match = new RegExp(regex).exec(txt)
    } else if (isJson) {
        match = new RegExp(`['"]${searchFor}['"].*:`).exec(txt)
    } else {
        match = new RegExp(`['"](?<found>${searchFor})['"].*=>`).exec(txt)
    }


    if (match) {
        console.log(match)

        let pos = doc.positionAt(match.index + match[0].length)

        return new Range(pos, pos)
    }
}

/* Config ------------------------------------------------------------------- */
const escapeStringRegexp = require('escape-string-regexp')
export let methods: any = ''

export function readConfig() {
    methods = workspace.getConfiguration('laravel-goto-lang').methods
    methods = methods.map((e) => escapeStringRegexp(e)).join('|')
}
