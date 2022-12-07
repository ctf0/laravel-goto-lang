'use strict';

import escapeStringRegexp from 'escape-string-regexp';
import {
    DocumentLink,
    DocumentLinkProvider,
    TextDocument,
    window,
} from 'vscode';
import * as util from '../util';

export default class LinkProvider implements DocumentLinkProvider {
    methods;

    constructor() {
        this.methods = util.methods;
    }

    async provideDocumentLinks(doc: TextDocument): Promise<DocumentLink[]> {
        const editor = window.activeTextEditor;

        if (editor) {
            util.setWs(doc.uri);

            const text = doc.getText();
            const links = [];

            /* -------------------------------------------------------------------------- */
            const reg_sngl = new RegExp(`(?<=(${this.methods})\\()'([\\w\. ]+)'`, 'g');
            const reg_dbl = new RegExp(`(?<=(${this.methods})\\()"([\\w\. ]+)"`, 'g');
            const sngl_matches = [...text.matchAll(reg_sngl)];
            const dbl_matches = [...text.matchAll(reg_dbl)];

            for (const match of dbl_matches.concat(sngl_matches)) {
                const found = match[0];
                const files = await util.getFilePaths(found);
                const range = doc.getWordRangeAtPosition(
                    doc.positionAt(match.index),
                    new RegExp(escapeStringRegexp(found)),
                );

                if (files.length && range) {
                    for (const file of files) {
                        const documentlink = new DocumentLink(range, file.fileUri);
                        documentlink.tooltip = file.tooltip;

                        links.push(documentlink);
                    }
                }
            }

            return links;
        }
    }
}
