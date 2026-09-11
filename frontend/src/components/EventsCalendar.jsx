import { useMemo, useState } from 'react'
import './EventsCalendar.css'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function toDateKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

// Builds a 6-row x 7-col grid of Date objects covering the visible month,
// padded with leading/trailing days from adjacent months.
function buildMonthGrid(year, month) {
  const firstOfMonth = new Date(year, month, 1)
  const gridStart = new Date(year, month, 1 - firstOfMonth.getDay())

  const days = []
  const cursor = new Date(gridStart)
  for (let i = 0; i < 42; i += 1) {
    days.push(new Date(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return days
}

function EventsCalendar({ events, onSelectEvent }) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  const today = useMemo(() => new Date(), [])

  const eventsByDay = useMemo(() => {
    const map = new Map()
    for (const event of events) {
      if (!event.event_date) continue
      const key = toDateKey(new Date(event.event_date))
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(event)
    }
    // Keep each day's events in start-time order
    for (const list of map.values()) {
      list.sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
    }
    return map
  }, [events])

  const days = useMemo(
    () => buildMonthGrid(cursor.getFullYear(), cursor.getMonth()),
    [cursor]
  )

  function goToPrevMonth() {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))
  }

  function goToNextMonth() {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))
  }

  function goToToday() {
    const now = new Date()
    setCursor(new Date(now.getFullYear(), now.getMonth(), 1))
  }

  const monthLabel = cursor.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="cal">
      <div className="cal-toolbar">
        <div className="cal-toolbar-nav">
          <button type="button" className="cal-nav-btn" onClick={goToPrevMonth} aria-label="Previous month">
            &larr;
          </button>
          <h3 className="cal-month-label">{monthLabel}</h3>
          <button type="button" className="cal-nav-btn" onClick={goToNextMonth} aria-label="Next month">
            &rarr;
          </button>
        </div>
        <button type="button" className="btn btn-ghost cal-today-btn" onClick={goToToday}>
          Today
        </button>
      </div>

      <div className="cal-grid cal-weekday-row">
        {WEEKDAYS.map((day) => (
          <div key={day} className="cal-weekday">{day}</div>
        ))}
      </div>

      <div className="cal-grid cal-day-grid">
        {days.map((date) => {
          const key = toDateKey(date)
          const dayEvents = eventsByDay.get(key) || []
          const inCurrentMonth = date.getMonth() === cursor.getMonth()
          const isToday = isSameDay(date, today)
          const visible = dayEvents.slice(0, 3)
          const overflowCount = dayEvents.length - visible.length

          return (
            <div
              key={key}
              className={
                'cal-cell' +
                (inCurrentMonth ? '' : ' cal-cell-muted') +
                (isToday ? ' cal-cell-today' : '')
              }
            >
              <span className="cal-cell-date">{date.getDate()}</span>
              <div className="cal-cell-events">
                {visible.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    className={`cal-event-pill event-status-${event.status}`}
                    onClick={() => onSelectEvent(event)}
                    title={event.title || event.opponent || 'Training session'}
                  >
                    {event.title || event.opponent || 'Training'}
                  </button>
                ))}
                {overflowCount > 0 && (
                  <span className="cal-event-overflow">+{overflowCount} more</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default EventsCalendar