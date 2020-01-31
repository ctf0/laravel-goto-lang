'use strict'

import { workspace, TextDocument, Uri, env } from 'vscode'

const glob = require("fast-glob")

export async function getFilePaths(text: string, document: TextDocument) {
    let info = text.match(new RegExp(/['"](.*?)['"]/))[1]
    let langPath = '/resources/lang'

    if (info.includes("::")) {
        let searchFor = info.split('::')
        langPath = `${langPath}/vendor/${searchFor[0]}`
        info = searchFor[1]
    }

    return getData(document, langPath, info)
}

async function getData(document, path, list) {
    let fileList = list.split('.')
    let info = fileList.slice(1).join('.')
    fileList.pop()

    let workspaceFolder = workspace.getWorkspaceFolder(document.uri).uri.fsPath
    let toCheck = []
    while (fileList.length > 0) {
        toCheck.push(`**/${fileList.join('/')}.php`)
        fileList.pop()
    }

    let editor = `${env.uriScheme}://file`
    let result = await glob(toCheck, { cwd: `${workspaceFolder}${path}` })
    result = result.map((item) => {
        return {
            "showPath": item,
            fileUri: Uri
                .parse(`${editor}${workspaceFolder}${path}/${item}?query=${info}`)
                .with({ authority: 'ctf0.laravel-goto-lang' })
        }
    })

    return result
}
