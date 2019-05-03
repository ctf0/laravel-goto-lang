'use strict';

import { workspace, TextDocument, Uri } from 'vscode';
import * as fs from "fs";

export function getFilePath(text: string, document: TextDocument) {
    let paths = getFilePaths(text, document);
    return paths.length > 0 ? paths[0] : null;
}

export function getFilePaths(text: string, document: TextDocument) {
    let workspaceFolder = workspace.getWorkspaceFolder(document.uri).uri.fsPath;
    let path = scanLangPaths(document);
    let extension = '.php';
    let clean = text.replace(/\"|\'/g, '');
    let split = clean.split('.');
    let result = [];

    // add to the hover list
    while (split.length) {
        let join = split.join('/');
        let showPath = `${path}/${join}${extension}`;
        let filePath = workspaceFolder + showPath;

        if (fs.existsSync(filePath)) {
            result.push({
                "name": 'en',
                "showPath": showPath,
                "fileUri": Uri.file(filePath)
            });
            split = []
        } else {
            split.pop();
        }
    }

    return result;
}

export function scanLangPaths(document: TextDocument) {
    return workspace.getConfiguration('laravel_goto_lang.folders').en;
}
