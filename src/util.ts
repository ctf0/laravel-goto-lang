'use strict'

import { workspace, TextDocument, Uri } from 'vscode'

const glob = require("fast-glob")

export async function getFilePaths(text: string, document: TextDocument) {
    let info = text.replace(new RegExp(/(trans|__|@lang)\(['"]|['"]\)/, 'g'), '')
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
    fileList.pop()

    let workspaceFolder = workspace.getWorkspaceFolder(document.uri).uri.fsPath
    let toCheck = []
    while (fileList.length > 0) {
        toCheck.push(`**/${fileList.join('/')}.php`)
        fileList.pop()
    }
    let result = await glob(toCheck, { cwd: `${workspaceFolder}${path}` })

    result = result.map((item) => {
        return {
            "showPath": item,
            "fileUri": Uri.file(`${workspaceFolder}${path}/${item}`)
        }
    })

    return result
}
