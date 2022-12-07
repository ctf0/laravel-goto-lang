'use strict';

import debounce from 'lodash.debounce';
import { commands, languages, window, workspace } from 'vscode';
import LinkProvider from './providers/linkProvider';
import * as util from './util';

let providers = [];

export function activate({ subscriptions }) {
    util.readConfig();

    // config
    workspace.onDidChangeConfiguration(async (e) => {
        if (e.affectsConfiguration(util.PACKAGE_NAME)) {
            util.readConfig();
        }
    });

    // links
    initProviders();
    window.onDidChangeActiveTextEditor(async (e) => {
        await clearAll();
        initProviders();
    });

    // scroll
    subscriptions.push(commands.registerCommand(util.CMND_NAME, util.scrollToText));
}

function clearAll() {
    return new Promise((res, rej) => {
        providers.map((e) => e.dispose());
        providers = [];

        setTimeout(() => res(true), 500);
    });
}

const initProviders = debounce(() => {
    providers.push(languages.registerDocumentLinkProvider(['php', 'blade'], new LinkProvider()));
}, 250);

export function deactivate() {
    clearAll();
}
