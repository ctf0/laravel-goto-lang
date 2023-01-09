'use strict';

import escapeStringRegexp from 'escape-string-regexp';
import { execaCommand } from 'execa';
import glob from 'fast-glob';
import * as fs from 'fs-extra';
import * as path from 'node:path';
import { pascalcase } from 'pascalcase';
import {
    DocumentSymbol,
    Range,
    Selection,
    TextEditorRevealType,
    Uri,
    WorkspaceConfiguration,
    commands,
    env,
    window,
    workspace,
} from 'vscode';

const sep = path.sep;
export const CMND_NAME = 'lgl.openFile';
const SCHEME = `command:${CMND_NAME}`;

let ws;

export function setWs(uri) {
    ws = workspace.getWorkspaceFolder(uri)?.uri.fsPath;
}

/* -------------------------------------------------------------------------- */

const cache_store = [];

export async function getFilePaths(text) {
    text = text.replace(/(^['"]|['"]$)/g, '');

    if (text.endsWith('.')) {
        return [];
    }

    const fullKey = text;
    let list = checkCache(cache_store, fullKey);

    if (!list.length) {
        const internal = getDocFullPath(config.defaultPath);
        const char = '::';

        if (text.includes(char)) {
            text = text.split(char);
            const vendor = text[0];
            const key = text[1];

            list = await Promise.all(
                config.vendorPath
                    .map((item) => getData(
                        getDocFullPath(item).replace('*', pascalcase(vendor)),
                        key,
                        fullKey,
                    ))
                    .concat(await getData(`${internal}${sep}vendor${sep}${vendor}`, key, fullKey)),
            );

            list = list.flat();
        } else {
            list = await getData(internal, text, fullKey);
        }

        if (list.length) {
            saveCache(cache_store, fullKey, list);
        }
    }

    return list;
}

async function getData(path, key, fullKey) {
    let result;

    if (!key.includes(' ')) {
        const fileList = key.split('.');

        result = fileList.length > 1
            ? await phpFilePattern(path, fileList)
            : await jsonFilePattern(path, key, fullKey);
    } else {
        result = await jsonFilePattern(path, key, fullKey);
    }

    return result;
}

async function phpFilePattern(path, fileList) {
    const info = fileList.slice(1).join('.');
    fileList.pop();

    const toCheck = [];
    while (fileList.length > 0) {
        toCheck.push(`**/${fileList.join(sep)}.php`);
        fileList.pop();
    }

    const result = await glob(toCheck, { cwd: path });
    const data = [];

    for (const file of result) {
        const sepFile = `${sep}${file}`;
        const fullPath = normalizePath(`${path}${sep}${file}`);
        const url = getDocFullPath(path, false) + `${sepFile}`;

        const val = await getLangValue(fullPath, info, url, false);
        const args = prepareArgs({ path: fullPath, query: encodeURI(info) });

        data.push({
            tooltip : val ? `${val} (${url})` : url,
            fileUri : Uri.parse(`${SCHEME}?${args}`),
        });
    }

    return data;
}

async function jsonFilePattern(path, key, fullKey) {
    const result = await glob('*.json', { cwd: path });
    const data = [];

    for (const file of result) {
        const sepFile = `${sep}${file}`;
        const fullPath = normalizePath(`${path}${sepFile}`);
        const url = getDocFullPath(path, false) + `${sepFile}`;

        const val = await getLangValue(fullPath, fullKey, url, true);
        const args = prepareArgs({ path: fullPath, query: encodeURI(key), fragment: 'json' });

        data.push({
            tooltip : val ? `${val} (${url})` : url,
            fileUri : Uri.parse(`${SCHEME}?${args}`),
        });
    }

    return data;
}

function prepareArgs(args: object) {
    return encodeURIComponent(JSON.stringify([args]));
}

function normalizePath(path) {
    return path
        .replace(/\/+/g, '/')
        .replace(/\+/g, '\\');
}

function getDocFullPath(path, add = true) {
    return add
        ? `${ws}${path}`.replace(/[\\\/]/g, sep)
        : path.replace(`${ws}${sep}`, '');
}

/* Lang Values ------------------------------------------------------------------- */
const cache_store_lang_keys = [];

async function getLangValue(filePath, key_text, cache_key, isJson = false) {
    if (config.showValueOnHover) {
        let val = '';
        const cacheData = cache_store_lang_keys.find((file) => file.name == cache_key);

        if (cacheData) {
            val = cacheData.dataList[key_text];
        }

        if (!val) {
            try {
                let fileData = '';

                if (isJson) {
                    fileData = await fs.readJson(filePath);
                } else {
                    filePath = filePath.replace(`${ws}/`, '');

                    const { stdout } = await execaCommand(`${config.phpCommand} -r 'print json_encode(include("${filePath}"));'`, {
                        cwd   : ws,
                        shell : env.shell,
                    });

                    fileData = JSON.parse(stdout);
                }

                if (cacheData) {
                    cacheData.dataList = fileData;
                } else {
                    cache_store_lang_keys.push({
                        name     : cache_key,
                        dataList : fileData,
                    });
                }

                val = fileData[key_text];
            } catch (error) {
                // console.error(error)
            }
        }

        return val;
    }
}

/* Scroll ------------------------------------------------------------------- */
export function scrollToText(args) {
    if (args !== undefined) {
        let { path, query, fragment } = args;
        query = decodeURI(query);

        commands.executeCommand('vscode.open', Uri.file(path))
            .then(async () => {
                const editor = window.activeTextEditor;
                const range: Range = await getTextPosition(query, editor.document, fragment);

                if (range) {
                    editor.selection = new Selection(range.start, range.end);
                    editor.revealRange(range, TextEditorRevealType.InCenter);
                }

                if (!range && query) {
                    window.showInformationMessage(
                        'Laravel Goto Lang: Copy Key Name To Clipboard',
                        ...['Copy'],
                    ).then((e) => {
                        if (e) {
                            env.clipboard.writeText(
                                fragment !== undefined
                                    ? query
                                    : `'${query}' => `,
                            );
                        }
                    });
                }
            });
    }
}

async function getTextPosition(query, document, isJson) {
    const symbols: DocumentSymbol[] = await commands.executeCommand('vscode.executeDocumentSymbolProvider', document.uri);

    if (query.includes('.') && isJson === undefined) {
        query = query.split('.');

        if (query.length > 1) {
            return getRange(symbols, query);
        } else {
        }
    }

    return symbols.find((symbol) => symbol.name == query)?.location.range;
}

function getRange(symbolsList: Array<any>, keysArray: string[]): any {
    let key: any = null;

    while (keysArray.length) {
        key = keysArray.shift();
        const node = symbolsList.find((symbol: any) => symbol.name === key);

        if (node) {
            if (node.children && keysArray.length) {
                return getRange(node.children, keysArray);
            }

            return node.location.range;
        }

        break;
    }
}

/* Helpers ------------------------------------------------------------------ */

function checkCache(cache_store, text) {
    const check = cache_store.find((e) => e.key == text);

    return check ? check.val : [];
}

function saveCache(cache_store, text, val) {
    checkCache(cache_store, text).length
        ? false
        : cache_store.push({
            key : text,
            val : val,
        });

    return val;
}

/* Config ------------------------------------------------------------------- */
export const PACKAGE_NAME = 'laravelGotoLang';
export let methods = '';
let config: WorkspaceConfiguration;

export function readConfig() {
    config = workspace.getConfiguration(PACKAGE_NAME);
    methods = config.methods.map((e) => escapeStringRegexp(e)).join('|');
}
