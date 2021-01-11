'use strict'

import {
    ExtensionContext,
    languages,
    window,
    workspace
} from 'vscode'
import LinkProvider from './providers/linkProvider'
import * as util    from './util'

const debounce = require('lodash.debounce')
let providers = []

export function activate(context: ExtensionContext) {
    util.readConfig()

    // config
    workspace.onDidChangeConfiguration(async (e) => {
        if (e.affectsConfiguration(util.PACKAGE_NAME)) {
            util.readConfig()
        }
    })

    // links
    if (window.activeTextEditor) {
        setTimeout(() => {
            initProviders()
        }, 2000)
    }

    window.onDidChangeActiveTextEditor(
        debounce(async function (editor) {
            if (editor) {
                await clearAll()
                initProviders()
            }
        }, 250)
    )

    // scroll
    util.scrollToText()
}

const initProviders = debounce(function () {
    providers.push(languages.registerDocumentLinkProvider(['php', 'blade'], new LinkProvider()))
}, 250)

function clearAll() {
    return new Promise((res, rej) => {
        providers.map((e) => e.dispose())
        providers = []

        setTimeout(() => {
            return res(true)
        }, 500)
    })
}

export function deactivate() {
    clearAll()
}
