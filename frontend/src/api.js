// Small fetch wrapper for the Django API. Sends the CSRF token on every write.
const cookie = (name) =>
  document.cookie.split('; ').find((c) => c.startsWith(name + '='))?.split('=')[1] ?? ''

// Turn a Django REST Framework error body into one readable sentence.
function message(data, status) {
  if (!data) return `Request failed (${status}).`
  if (typeof data === 'string') return data
  if (data.detail) return data.detail
  return Object.values(data).flat().join(' ')
}

export async function api(path, { method = 'GET', body, params } = {}) {
  const query = params
    ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString()
    : ''
  const response = await fetch('/api' + path + query, {
    method,
    credentials: 'same-origin',
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(method !== 'GET' ? { 'X-CSRFToken': cookie('csrftoken') } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new Error(message(data, response.status))
  return data
}
