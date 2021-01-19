module.exports = function(first, second, fileName) {
    function fail(message) {
        throw new Error(message + ' File name: ' + fileName + '.');
    }

    function getElement(src, path, isOptional) {
        let result = src;
        let breadcrumbs = '';
    
        for (const pnode of path) {
            breadcrumbs += '/' + pnode;
    
            if (!result.elements) {
                if (!isOptional) {
                    fail(breadcrumbs + ' - expected element ' + pnode + ' not found. Make sure that the XLF file schema is correct.');
                } else {
                    return null;
                }
            }
    
            result = result.elements.find(e => e.name === pnode);
            if (!result) {
                if (!isOptional) {
                    fail('Element ' + breadcrumbs + ' not found. Make sure that the XLF file schema is correct.');
                } else {
                    return null;
                }
            }
        }
    
        return result;
    }
    
    function getContent(src) {
        const result = ((src && src.elements) || []).find(e => e.type === 'text');
        return result ? result.text : '';
    }
    
    function* getTransUnits(root) {
        if (!root.elements) {
            console.log('Skipping ', fileName, '- no trans-units found.');
            return;
        }
    
        for (const el of root.elements) {
            if (el.name === 'trans-unit') {
                yield el;
            }
        }
    }

    const transPath = ['xliff', 'file', 'body'];
    const srcRoot = getElement(first, transPath);
    const tgtRoot = getElement(second, transPath);
    const tgtTransUnits = [...getTransUnits(tgtRoot)];
    let numMergedTransUnits = 0;

    function findTgtById(id) {
        return tgtTransUnits.find(t => t.attributes && t.attributes.id === id);
    }

    for (const srcTransUnit of getTransUnits(srcRoot)) {
        const id = srcTransUnit.attributes.id;
        const element = getElement(srcTransUnit, ['target'], true);
        let content = getContent(element);

        const matchingTgt = findTgtById(id);
        if (matchingTgt) {
            const tgtContent = getContent(getElement(matchingTgt, ['target'], true));
            if (content !== tgtContent) {
                console.log(`trans-unit ${id} is already present. Preferring ${fileName}: "${tgtContent}" over "${content}".`);

                // Update the content
                content = tgtContent;

                // fail('Translations mismatch at trans-unit ID: ' + id + '.');
            }
        } else {
            if (!tgtRoot.elements) {
                tgtRoot.elements = [];
            }

            tgtRoot.elements.push(srcTransUnit);
            numMergedTransUnits++;
        }
    }

    console.log(fileName, ' -> ', numMergedTransUnits, 'translations merged');
    return second;
}
