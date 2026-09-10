import {
    describe,
    expect,
    it,
} from 'vitest'

import * as calendar from './calendar.ts'
import * as charts from './charts.ts'
import * as commandPalette from './command-palette.ts'
import * as dataAdapter from './data-adapter.ts'
import * as details from './details.ts'
import * as fileManager from './file-manager.ts'
import * as formControls from './form-controls.ts'
import * as inbox from './inbox.ts'
import * as kanban from './kanban.ts'
import * as markup from './markup.ts'
import * as menus from './menus.ts'
import * as modal from './modal.ts'
import * as pageActions from './page-actions.ts'
import * as productImages from './product-images.ts'
import * as productMockups from './product-mockups.ts'
import * as settings from './settings.ts'
import * as shell from './shell.ts'
import * as shellRender from './shell-render.ts'
import * as tables from './tables.ts'
import * as toast from './toast.ts'

const RUNTIME_FACADES = {
    calendar,
    charts,
    commandPalette,
    dataAdapter,
    details,
    fileManager,
    formControls,
    inbox,
    kanban,
    markup,
    menus,
    modal,
    pageActions,
    productImages,
    productMockups,
    settings,
    shell,
    shellRender,
    tables,
    toast,
}

describe('Gentelella runtime facades', () => {
    it('loads every upstream v4 runtime module independently', () => {
        for (const [name, facade] of Object.entries(RUNTIME_FACADES))
            expect(Object.keys(facade).length, `${name} must expose an upstream runtime`).toBeGreaterThan(0)
    })
})
