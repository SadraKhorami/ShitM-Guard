local API_BASE = GetConvar('auth_api_base', '')
local API_SECRET = GetConvar('auth_api_secret', '')
local VALIDATE_TIMEOUT_MS = tonumber(GetConvar('auth_api_timeout_ms', '5000')) or 5000
local LOG_ERRORS = GetConvar('auth_log_errors', 'true') == 'true'
local LOG_INTERVAL_SEC = tonumber(GetConvar('auth_log_interval_sec', '10')) or 10
local lastLogAt = 0

local function logWarn(message)
  if not LOG_ERRORS then return end
  local now = os.time()
  if now - lastLogAt < LOG_INTERVAL_SEC then return end
  lastLogAt = now
  print(('[auth_gate] %s'):format(message))
end

local function extractIdentifiers(src)
  local ids = {
    license = nil,
    steam = nil,
    rockstar = nil
  }

  for _, id in ipairs(GetPlayerIdentifiers(src)) do
    if string.sub(id, 1, 8) == 'license:' then
      ids.license = id
    elseif string.sub(id, 1, 6) == 'steam:' then
      ids.steam = id
    elseif string.sub(id, 1, 9) == 'license2:' then
      ids.license = id
    elseif string.sub(id, 1, 9) == 'rockstar:' then
      ids.rockstar = id
    end
  end

  return ids
end

local function httpPost(url, payload, headers, timeoutMs)
  local p = promise.new()
  local done = false

  PerformHttpRequest(url, function(code, body, _headers)
    if done then return end
    done = true
    p:resolve({ code = code, body = body })
  end, 'POST', payload, headers)

  SetTimeout(timeoutMs, function()
    if done then return end
    done = true
    p:resolve({ code = 0, body = 'timeout' })
  end)

  return Citizen.Await(p)
end

AddEventHandler('playerConnecting', function(name, setKickReason, deferrals)
  local src = source

  deferrals.defer()
  deferrals.update('Authorizing...')

  if API_BASE == '' or API_SECRET == '' then
    logWarn('auth service misconfigured')
    deferrals.done('Auth service misconfigured')
    return
  end

  local ids = extractIdentifiers(src)
  if not ids.license and not ids.steam and not ids.rockstar then
    logWarn('missing identifiers')
    deferrals.done('Not authorized')
    return
  end

  local ip = GetPlayerEndpoint(src) or ''
  if ip == '' then
    logWarn('missing endpoint')
    deferrals.done('Not authorized')
    return
  end

  local payload = json.encode({
    license = ids.license,
    steam = ids.steam,
    rockstar = ids.rockstar,
    ip = ip
  })

  local url = string.format('%s/api/fivem/validate', API_BASE)
  local headers = {
    ['Content-Type'] = 'application/json',
    ['X-Fivem-Secret'] = API_SECRET
  }

  local res = httpPost(url, payload, headers, VALIDATE_TIMEOUT_MS)
  if res.code ~= 200 then
    logWarn(('auth failed (%s)'):format(res.code))
    deferrals.done('Not authorized')
    return
  end

  deferrals.done()
end)
