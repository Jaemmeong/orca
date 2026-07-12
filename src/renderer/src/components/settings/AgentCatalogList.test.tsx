// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { AgentCatalogList } from './AgentCatalogList'
import type { AgentCatalogRow } from './agent-catalog-rows'
import type { AgentCatalogRowCallbacks } from './AgentCatalogRowView'
import type { CustomTuiAgentId } from '../../../../shared/types'

// happy-dom reports zero layout, so @tanstack/react-virtual would window nothing.
// Give the scroll container a real viewport height and each row its estimate so
// the mounted-DOM bound is actually exercised.
function isRowElement(el: HTMLElement): boolean {
  return typeof el.hasAttribute === 'function' && el.hasAttribute('data-agent-catalog-row')
}

let restore: (() => void) | undefined
beforeEach(() => {
  // @tanstack/react-virtual measures the scroll container via offsetHeight and
  // each row via getBoundingClientRect; happy-dom reports zero for both, so the
  // virtualizer would window nothing. Feed a real viewport height (container)
  // and the row estimate so the mounted-DOM bound is genuinely exercised.
  const rect = HTMLElement.prototype.getBoundingClientRect
  HTMLElement.prototype.getBoundingClientRect = function (): DOMRect {
    const height = isRowElement(this) ? 52 : 500
    return {
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 400,
      bottom: height,
      width: 400,
      height,
      toJSON() {}
    }
  }
  const offsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight')
  const offsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth')
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
    configurable: true,
    get(this: HTMLElement) {
      return isRowElement(this) ? 52 : 500
    }
  })
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
    configurable: true,
    get: () => 400
  })
  restore = () => {
    HTMLElement.prototype.getBoundingClientRect = rect
    if (offsetHeight) {
      Object.defineProperty(HTMLElement.prototype, 'offsetHeight', offsetHeight)
    }
    if (offsetWidth) {
      Object.defineProperty(HTMLElement.prototype, 'offsetWidth', offsetWidth)
    }
  }
})

afterEach(() => {
  restore?.()
  cleanup()
})

function callbacks(): AgentCatalogRowCallbacks {
  return {
    onToggleEnabled: vi.fn(),
    onEdit: vi.fn(),
    onDuplicate: vi.fn(),
    onDelete: vi.fn(),
    onRepair: vi.fn(),
    onReviewReferences: vi.fn()
  }
}

function customRow(index: number): AgentCatalogRow {
  const label = `Agent ${index}`
  return {
    kind: 'custom',
    id: `custom-agent:codex:${index}` as CustomTuiAgentId,
    baseAgent: 'codex',
    label,
    commandSummary: 'codex',
    status: 'enabled',
    enabled: true,
    isDefault: false,
    searchSummary: `agent ${index} codex`
  }
}

describe('AgentCatalogList', () => {
  it('filters the visible rows by the search query', () => {
    const rows = [customRow(1), customRow(2)]
    render(<AgentCatalogList rows={rows} {...callbacks()} />)
    fireEvent.change(screen.getByLabelText('Search agents'), { target: { value: 'Agent 1' } })
    expect(screen.getByText('Agent 1')).toBeTruthy()
    expect(screen.queryByText('Agent 2')).toBeNull()
  })

  it('shows the no-match state while preserving the query', () => {
    render(<AgentCatalogList rows={[customRow(1)]} {...callbacks()} />)
    const input = screen.getByLabelText('Search agents') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'zzz' } })
    expect(screen.getByText('No agents match your search.')).toBeTruthy()
    expect(input.value).toBe('zzz')
  })

  it('mounts a bounded number of rows for a 1,000-agent catalog', () => {
    const rows = Array.from({ length: 1000 }, (_, i) => customRow(i))
    const { container } = render(<AgentCatalogList rows={rows} {...callbacks()} />)
    const mounted = container.querySelectorAll('[data-agent-catalog-row]')
    expect(mounted.length).toBeGreaterThan(0)
    expect(mounted.length).toBeLessThanOrEqual(60)
  })
})
