'use strict'

import {
    DocumentLink,
    DocumentLinkProvider,
    Position,
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
            const text = doc.getText()
            let links = []

            /* -------------------------------------------------------------------------- */

            let reg_single = new RegExp(`(?<=(${this.methods})\\()'([^$]*?)'`, 'g')
            let single_matches

            while ((single_matches = reg_single.exec(text)) !== null) {
                let found = single_matches[0]
                const line = doc.lineAt(doc.positionAt(single_matches.index).line)
                const indexOf = line.text.indexOf(found)
                const position = new Position(line.lineNumber, indexOf)
                const range = doc.getWordRangeAtPosition(position, new RegExp(reg_single))

                if (range) {
                    let files = await util.getFilePaths(found, doc)

                    if (files?.length) {
                        for (const file of files) {
                            let documentlink     = new DocumentLink(range, file.fileUri)
                            documentlink.tooltip = file.tooltip

                            links.push(documentlink)
                        }
                    }
                }
            }

            /* -------------------------------------------------------------------------- */

            let reg_double = new RegExp(`(?<=(${this.methods})\\()"([^$]*?)"`, 'g')
            let dbl_matches

            while ((dbl_matches = reg_double.exec(text)) !== null) {
                let found      = dbl_matches[0]
                const line     = doc.lineAt(doc.positionAt(dbl_matches.index).line)
                const indexOf  = line.text.indexOf(found)
                const position = new Position(line.lineNumber, indexOf)
                const range    = doc.getWordRangeAtPosition(position, new RegExp(reg_double))

                if (range) {
                    let files = await util.getFilePaths(found, doc)

                    if (files.length) {
                        for (const file of files) {
                            let documentlink     = new DocumentLink(range, file.fileUri)
                            documentlink.tooltip = file.tooltip

                            links.push(documentlink)
                        }
                    }
                }
            }

            return links
        }
    }
}
