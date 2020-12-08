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

export async function getFilePaths(text, document) {
    let info = text.replace(/(^['"]|['"]$)/g, '')
    let langPath = '/resources/lang'

    if (info.includes('::')) {
        let searchFor = info.split('::')
        langPath = `${langPath}/vendor/${searchFor[0]}`
        info = searchFor[1]
    }

    return getData(document, langPath, info)
}

async function getData(document, path, list) {
    let result
    let workspaceFolder = workspace.getWorkspaceFolder(document.uri)?.uri.fsPath
    let editor = `${env.uriScheme}://file`

    if (!list.includes(' ')) {
        let fileList = list.split('.')

        result = fileList.length > 1
            ? phpFilePattern(workspaceFolder, path, editor, fileList)
            : jsonFilePattern(workspaceFolder, path, editor, list)
    } else {
        result = jsonFilePattern(workspaceFolder, path, editor, list)
    }

    return result
}

async function phpFilePattern(workspaceFolder, path, editor, list) {
    let info = list.slice(1).join('.')
    list.pop()

    let toCheck = []
    while (list.length > 0) {
        toCheck.push(`**/${list.join('/')}.php`)
        list.pop()
    }

    let result = await glob(toCheck, {cwd: `${workspaceFolder}${path}`})

    return result.map((item) => {
        return {
            'showPath' : item,
            fileUri    : Uri
                .parse(`${editor}${workspaceFolder}${path}/${item}`)
                .with({authority: 'ctf0.laravel-goto-lang', query: info})
        }
    })
}

async function jsonFilePattern(workspaceFolder, path, editor, list) {
    let result = await glob('*.json', {cwd: `${workspaceFolder}${path}`})

    return result.map((item) => {
        return {
            'showPath' : item,
            fileUri    : Uri
                .parse(`${editor}${workspaceFolder}${path}/${item}`)
                .with({authority: 'ctf0.laravel-goto-lang', query: list, fragment: 'json'})
        }
    })
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

export function readConfig() {
    let config = workspace.getConfiguration(PACKAGE_NAME)
    methods = config.methods.map((e) => escapeStringRegexp(e)).join('|')
}
