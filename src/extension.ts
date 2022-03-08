'use strict'

import {languages, window, workspace} from 'vscode'
import LinkProvider from './providers/linkProvider'
import * as util from './util'
import { debounce } from 'lodash'

let providers  = []

export function activate() {
    util.readConfig()

    // config
    workspace.onDidChangeConfiguration(async (e) => {
        if (e.affectsConfiguration(util.PACKAGE_NAME)) {
            util.readConfig()
        }
    })

    // links
    initProviders()
    window.onDidChangeActiveTextEditor(async (e) => {
        await clearAll()
        initProviders()
    })

    // scroll
    util.scrollToText()
}

function clearAll() {
    return new Promise((res, rej) => {
        providers.map((e) => e.dispose())
        providers = []

        setTimeout(() => {
            return res(true)
        }, 500)
    })
}

const initProviders = debounce(function() {
    providers.push(languages.registerDocumentLinkProvider(['php', 'blade'], new LinkProvider()))
}, 250)

export function deactivate() {
    clearAll()
}
