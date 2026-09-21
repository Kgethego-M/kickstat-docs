import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import VenueMapEditor from './VenueMapEditor'

// jsdom has no layout, so the canvas reports a zero size (no tiles, no
// geometry). Pin it to a known viewport so the slippy-map maths run against
// stable numbers: a click at the canvas centre lands exactly on the default
// Johannesburg view, and the pin starts at the canvas centre when one is set.
const CANVAS = { width: 800, height: 400 }

function mockCanvasSize() {
  vi.spyOn(Element.prototype, 'clientWidth', 'get').mockReturnValue(CANVAS.width)
  vi.spyOn(Element.prototype, 'clientHeight', 'get').mockReturnValue(CANVAS.height)
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
    left: 0,
    top: 0,
    width: CANVAS.width,
    height: CANVAS.height,
    right: CANVAS.width,
    bottom: CANVAS.height,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  })
}

function canvas() {
  return screen.getByRole('application', { name: /venue map/i })
}

function tileSrcs() {
  return [...document.querySelectorAll('.venue-map-editor-tile')].map((t) => t.getAttribute('src'))
}

function clickCanvas(el, clientX, clientY, pointerId = 1) {
  fireEvent.pointerDown(el, { pointerId, clientX, clientY })
  fireEvent.pointerUp(el, { pointerId, clientX, clientY })
}

describe('VenueMapEditor', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    delete navigator.geolocation
  })

  it('renders OSM tiles, attribution and controls around the default view', () => {
    mockCanvasSize()
    render(<VenueMapEditor onChange={vi.fn()} />)

    const srcs = tileSrcs()
    expect(srcs.length).toBeGreaterThan(0)
    expect(srcs.every((src) => src.startsWith('https://tile.openstreetmap.org/12/'))).toBe(true)

    expect(screen.getByRole('link', { name: /OpenStreetMap contributors/i })).toHaveAttribute(
      'href',
      'https://www.openstreetmap.org/copyright'
    )
    expect(screen.getByRole('button', { name: 'Zoom in' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Zoom out' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Use my location/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Clear pin/i })).toBeNull()
    expect(screen.getByText(/Click the map to pin the pitch/i)).toBeInTheDocument()
  })

  it('zooms in when the + control is pressed', () => {
    mockCanvasSize()
    render(<VenueMapEditor onChange={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }))

    expect(tileSrcs().some((src) => src.startsWith('https://tile.openstreetmap.org/13/'))).toBe(true)
  })

  it('drops the pin where the coach clicks', () => {
    mockCanvasSize()
    const onChange = vi.fn()
    render(<VenueMapEditor onChange={onChange} />)

    // Canvas centre === the default Johannesburg view, so a centre click must
    // come back out as exactly the default centre coordinates.
    clickCanvas(canvas(), 400, 200)
    expect(onChange).toHaveBeenLastCalledWith({ lat: -26.2041, lng: 28.0473 })

    // A click east and south of centre moves the pin east and south.
    clickCanvas(canvas(), 600, 300, 2)
    const pin = onChange.mock.calls[1][0]
    expect(pin.lng).toBeGreaterThan(28.0473)
    expect(pin.lat).toBeLessThan(-26.2041)
  })

  it('pans on drag instead of dropping a pin', () => {
    mockCanvasSize()
    const onChange = vi.fn()
    render(<VenueMapEditor onChange={onChange} />)

    const el = canvas()
    fireEvent.pointerDown(el, { pointerId: 1, clientX: 400, clientY: 200 })
    fireEvent.pointerMove(el, { pointerId: 1, clientX: 520, clientY: 260 })
    fireEvent.pointerUp(el, { pointerId: 1, clientX: 520, clientY: 260 })

    expect(onChange).not.toHaveBeenCalled()
  })

  it('drags the existing pin to fine-tune it', () => {
    mockCanvasSize()
    const onChange = vi.fn()
    render(<VenueMapEditor latitude={-26.2041} longitude={28.0473} onChange={onChange} />)

    // With a pin supplied the map opens centred on it (zoom 15), so the pin
    // starts exactly at the canvas centre.
    expect(document.querySelector('.venue-map-editor-pin')).not.toBeNull()

    const el = canvas()
    fireEvent.pointerDown(el, { pointerId: 1, clientX: 400, clientY: 200 })
    fireEvent.pointerMove(el, { pointerId: 1, clientX: 412, clientY: 200 })
    fireEvent.pointerUp(el, { pointerId: 1, clientX: 412, clientY: 200 })

    expect(onChange).toHaveBeenCalledTimes(1)
    const moved = onChange.mock.calls[0][0]
    expect(moved.lng).toBeGreaterThan(28.0473)
    expect(moved.lat).toBeCloseTo(-26.2041, 3)
  })

  it('shows the pinned coordinates and clears the pin on demand', () => {
    mockCanvasSize()
    const onChange = vi.fn()
    render(<VenueMapEditor latitude={-26.2041} longitude={28.0473} onChange={onChange} />)

    expect(screen.getByText(/Pinned at -26.2041, 28.0473/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Clear pin/i }))
    expect(onChange).toHaveBeenCalledWith({ lat: null, lng: null })
  })

  it('pins the browser location when Use my location is pressed', () => {
    mockCanvasSize()
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: (success) =>
          success({ coords: { latitude: -26.1076, longitude: 28.0567 } }),
      },
    })

    const onChange = vi.fn()
    render(<VenueMapEditor onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: /Use my location/i }))

    expect(onChange).toHaveBeenCalledWith({ lat: -26.1076, lng: 28.0567 })
  })
})
