'use strict'

import {
    DocumentLink,
    DocumentLinkProvider,
    TextDocument,
    window
} from 'vscode'
import * as util from '../util'

export default class LinkProvider implements DocumentLinkProvider {
    methods

    constructor() {
        this.methods = util.methods
    }

    async provideDocumentLinks(doc: TextDocument): Promise<DocumentLink[]> {
        let editor = window.activeTextEditor

        if (editor) {
            util.setWs(doc.uri)

            const text = doc.getText()
            let links  = []

            /* -------------------------------------------------------------------------- */

            const reg_sngl   = new RegExp(`(?<=(${this.methods})\\()'([^$]*?)'`, 'g')
            const reg_dbl    = new RegExp(`(?<=(${this.methods})\\()"([^$]*?)"`, 'g')
            let sngl_matches = [...text.matchAll(reg_sngl)]
            let dbl_matches  = [...text.matchAll(reg_dbl)]

            for (const match of dbl_matches.concat(sngl_matches)) {
                let found = match[0]
                let files = await util.getFilePaths(found)

                if (files.length) {
                    const range = doc.getWordRangeAtPosition(
                        doc.positionAt(match.index),
                        reg_sngl
                    )

                    for (const file of files) {
                        let documentlink     = new DocumentLink(range, file.fileUri)
                        documentlink.tooltip = file.tooltip

                        links.push(documentlink)
                    }
                }
            }

            return links
        }
    }
}
