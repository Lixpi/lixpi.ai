// Root shell: the Gentelella sidebar plus the content pane that swaps between
// the parameter registry and the model catalog on the active route.
// Renderer: TypeScript `html` DOM, no framework runtime.

import {
    createGentelellaApplicationShell,
    type GentelellaApplicationShellInstance,
    type GentelellaApplicationShellNavigationItem,
} from '@lixpi/ui-kit-gentelella/components/application-shell'
import { html } from '@lixpi/ui-primitives/dom'

import RouterService, {
    MODEL_CATALOG_ROUTE_PATH,
    MODEL_PARAMETERS_ROUTE_PATH,
} from '$src/services/router-service.ts'
import { routerStore } from '$src/stores/routerStore.ts'
import {
    catalogIcon,
    slidersIcon,
} from '$src/views/layouts/icons.ts'
import {
    createModelCatalogView,
    type ModelCatalogViewInstance,
} from '$src/views/modelCatalog/modelCatalogView.ts'
import {
    createModelParametersView,
    type ModelParametersViewInstance,
} from '$src/views/modelParameters/modelParametersView.ts'
import '$src/views/layouts/layout.scss'

const NAVIGATION_ITEMS: GentelellaApplicationShellNavigationItem[] = [
    {
        path: MODEL_PARAMETERS_ROUTE_PATH,
        label: 'Model parameters',
        iconHtml: slidersIcon,
    },
    {
        path: MODEL_CATALOG_ROUTE_PATH,
        label: 'Model catalog',
        iconHtml: catalogIcon,
    },
]

export type LayoutInstance = {
    el: HTMLElement
    destroy: () => void
}

type MountedView = ModelCatalogViewInstance | ModelParametersViewInstance

class Layout implements LayoutInstance {
    readonly el: HTMLElement

    private readonly contentEl: HTMLDivElement
    private readonly shell: GentelellaApplicationShellInstance
    private readonly unsubscribeRouter: () => void

    private mountedPath: string | null = null
    private view: MountedView | null = null

    constructor() {
        this.shell = createGentelellaApplicationShell({
            brand: {
                mark: 'AI',
                name: 'Model Registry',
            },
            navigationGroups: [{
                label: 'Registry',
                items: NAVIGATION_ITEMS,
            }],
            footerContent: html`<span className="registry-sidebar-note">Lixpi</span>`,
            onNavigate: path => RouterService.navigateTo(path),
        })
        this.contentEl = this.shell.contentEl
        this.el = this.shell.el

        this.unsubscribeRouter = routerStore.subscribe(({ data }) => void this.renderRoute(data.currentRoute.path))
    }

    private renderRoute(path: string): void {
        this.shell.setActivePath(path)

        if (path === this.mountedPath)
            return

        this.mountedPath = path
        this.view?.destroy()
        this.view = null

        if (!path)
            return

        this.view = path === MODEL_CATALOG_ROUTE_PATH
            ? createModelCatalogView()
            : createModelParametersView()
        this.contentEl.append(this.view.el)
        // Only now is the view in the document, which is what a view that reads
        // its own DOM back has been waiting for.
        this.view.mount()
    }

    destroy(): void {
        this.unsubscribeRouter()
        this.view?.destroy()
        this.view = null
        this.shell.destroy()
    }
}

export const createLayout = (): LayoutInstance => new Layout()
