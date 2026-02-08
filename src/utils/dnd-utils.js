
// dnd-utils.js

export const findItemDeep = (items, id) => {
    for (const item of items) {
        if (item.id === id) return item;
        if (item.children) {
            const found = findItemDeep(item.children, id);
            if (found) return found;
        }
    }
    return null;
};

export const removeItemDeep = (items, id) => {
    return items
        .filter(item => item.id !== id)
        .map(item => {
            if (item.children) {
                return { ...item, children: removeItemDeep(item.children, id) };
            }
            return item;
        });
};

export const insertItemDeep = (items, targetId, position, itemToInsert) => {
    // position: 'before', 'after', 'inside'

    // If targetId is null (root level insert), we handle it outside or treat 'root' as target
    if (targetId === 'root') {
        return [...items, itemToInsert];
    }

    const insertRecursive = (list) => {
        // Check if target is in this list
        const index = list.findIndex(i => i.id === targetId);
        if (index !== -1) {
            const newList = [...list];
            if (position === 'before') {
                newList.splice(index, 0, itemToInsert);
            } else if (position === 'after') {
                newList.splice(index + 1, 0, itemToInsert);
            } else if (position === 'inside') {
                // Should not happen here ideally, 'inside' implies adding to children
                const target = newList[index];
                const newChildren = target.children ? [...target.children, itemToInsert] : [itemToInsert];
                newList[index] = { ...target, children: newChildren, expanded: true };
            }
            return newList;
        }

        return list.map(item => {
            if (item.children) {
                // If position is 'inside' and this is the target
                if (item.id === targetId && position === 'inside') {
                    return {
                        ...item,
                        children: [...item.children, itemToInsert],
                        expanded: true
                    };
                }
                return { ...item, children: insertRecursive(item.children) };
            }
            return item;
        });
    };

    return insertRecursive(items);
};
