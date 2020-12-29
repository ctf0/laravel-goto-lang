'use strict'

import {
    DocumentLink,
    DocumentLinkProvider as vsDocumentLinkProvider,
    Position,
    Range,
    TextDocument,
    window
} from 'vscode'
import * as util from '../util'

export default class LinkProvider implements vsDocumentLinkProvider {

    regex

    constructor() {
        this.regex = util.methods
    }

    async provideDocumentLinks(doc: TextDocument): Promise<DocumentLink[]> {
        let editor = window.activeTextEditor

        if (editor) {
            let range = editor.visibleRanges[0]
            let reg_single = new RegExp(`(?<=(${this.regex})\\()'([^$]*?)'`, 'g')
            let reg_double = new RegExp(`(?<=(${this.regex})\\()"([^$]*?)"`, 'g')
            let documentLinks = []

            for (let i = range.start.line; i <= range.end.line; i++) {
                let line = doc.lineAt(i)
                let txt = line.text

                await Promise.all(
                    Array
                        .from([
                            txt.match(reg_single),
                            txt.match(reg_double)
                        ])
                        .filter((e) => e)
                        .flat() // cuz each match return an array
                        .map(async (found) => {
                            let files = await util.getFilePaths(found, doc)

                            if (files.length) {
                                let start = new Position(line.lineNumber, txt.indexOf(found))
                                let end   = start.translate(0, found.length)

                                files.map((file) => {
                                    let documentlink     = new DocumentLink(new Range(start, end), file.fileUri)
                                    documentlink.tooltip = file.tooltip

                                    documentLinks.push(documentlink)
                                })
                            }
                        })
                )
            }

            return documentLinks
        }
    }
}
