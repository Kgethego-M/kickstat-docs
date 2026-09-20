import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { apiRequest } from '../lib/api'
import Loader from './Loader'
import './WeatherWidget.css'

// US18 — Venue Weather Forecast.
// `location` is a free-text venue string (from the event's `location`
// field, or whatever the coach has typed so far in the create form).
// `compact` renders a smaller inline version for use inside a form,
// versus the fuller card used on the event detail page.
export default function WeatherWidget({ location, compact = false }) {
  const { getToken } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const debounceRef = useRef(null)

  useEffect(() => {
    const trimmed = (location || '').trim()

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (!trimmed) {
      setData(null)
      setError('')
      setLoading(false)
      return
    }

    // Debounced so a form preview doesn't fire a request on every keystroke.
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      setError('')
      try {
        const result = await apiRequest(`/api/weather?location=${encodeURIComponent(trimmed)}`, {
          getToken,
        })
        setData(result)
      } catch (err) {
        setError(err.message)
        setData(null)
      } finally {
        setLoading(false)
      }
    }, 500)

    return () => clearTimeout(debounceRef.current)
  }, [location, getToken])

  if (!(location || '').trim()) {
    return null
  }

  if (loading) {
    return (
      <div className={`weather-widget${compact ? ' weather-widget-compact' : ''}`}>
        <Loader inline size="sm" label="Loading weather..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className={`weather-widget weather-widget-error${compact ? ' weather-widget-compact' : ''}`}>
        Couldn't load weather: {error}
      </div>
    )
  }

  if (!data || !data.current) {
    return null
  }

  return (
    <div className={`weather-widget${compact ? ' weather-widget-compact' : ''}`}>
      <div className="weather-widget-current">
        <span className="weather-widget-icon">{data.current.icon}</span>
        <div>
          <span className="weather-widget-temp">{Math.round(data.current.temperatureC)}°C</span>
          <span className="weather-widget-desc">{data.current.description}</span>
        </div>
        <span className="weather-widget-location">{data.resolvedLocation}</span>
      </div>

      {!compact && data.daily && data.daily.length > 0 && (
        <div className="weather-widget-daily">
          {data.daily.map((day) => (
            <div key={day.date} className="weather-widget-day">
              <span className="weather-widget-day-date">
                {new Date(day.date).toLocaleDateString(undefined, { weekday: 'short' })}
              </span>
              <span className="weather-widget-day-icon">{day.icon}</span>
              <span className="weather-widget-day-temps">
                {Math.round(day.maxC)}° / {Math.round(day.minC)}°
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
