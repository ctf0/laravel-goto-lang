'use strict';

import { workspace, TextDocument, Uri } from 'vscode';
import * as fs from "fs";

export function getFilePath(text: string, document: TextDocument) {
    let paths = getFilePaths(text, document)
    return paths.length ? paths[0] : null;
}

export function getFilePaths(text: string, document: TextDocument) {
    let info = text.replace(/\"|\'/g, '');
    let langPath = '/resources/lang'

    if (info.includes("::")) {
        let searchFor = info.split('::')
        langPath = `${langPath}/vendor/${searchFor[0]}`
        info = searchFor[1]
    }

    return getData(document, langPath, info)
}

function getData(document, path, list) {
    let workspaceFolder = workspace.getWorkspaceFolder(document.uri).uri.fsPath;
    let locales = workspace.getConfiguration('laravel_goto_lang').locales;
    let fileList = list.split('.')
    let result = [];
    let found = null

    locales.forEach(code => {
        let whereTo = `${path}/${code}/`

        if (found) {
            let showPath = `${whereTo}${found}`;
            let filePath = workspaceFolder + showPath;

            if (fs.existsSync(filePath)) {
                result.push({
                    "name": code,
                    "showPath": showPath,
                    "fileUri": Uri.file(filePath)
                });
            }
        } else {
            while (!found) {
                let join = fileList.join('/');
                let file = `${join}.php`
                let showPath = `${whereTo}${file}`;
                let filePath = workspaceFolder + showPath;

                if (fs.existsSync(filePath)) {
                    result.push({
                        "name": code,
                        "showPath": showPath,
                        "fileUri": Uri.file(filePath)
                    });
                    found = file
                } else {
                    fileList.pop();
                }
            }
        }
    });

    return result;
}
