export class SvelteComponentRenderer {
    static create(node, Component, additionalProps = {}) {
        const element = document.createElement('div');
        const component = new Component({ 
            target: element, 
            props: { 
                node,
                ...additionalProps 
            } 
        });
        node._svelteComponent = component;
        return element;
    }
    
    static destroy(node) {
        const component = node._svelteComponent;
        if (component) {
            component.$destroy();
            delete node._svelteComponent;
        }
    }
}
