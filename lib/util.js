// utility functions

// process an environment variable
export function env(name, def = null) {

  const val = process.env[name];
  if (!val) return def;
  const num = +val;
  return isNaN(num) ? val : num;

}

// fetch (10-second timeout default)
export function apiFetch({
  uri = null,
  method = 'GET',
  authKey = 'NOAUTH',
  contentType = 'application/json',
  body = null,
  timeout = 10000
} = {}) {

  const response = { ok: false, status: 0, body: null };

  // no URI set?
  if (!uri) return response;

  // format URL
  method = method.trim().toUpperCase();

  const
    url = new URL(uri),
    controller = new AbortController(),
    timer = setTimeout(() => controller.abort(), timeout),
    opt = {
      method,
      headers: {
        'Authorization': `Bearer ${ authKey }`,
        'Content-Type': contentType
      },
      signal: controller.signal
    };

  // format data
  if (body) {
    if (method === 'GET') {
      url.search = new URLSearchParams(body);
    }
    else {
      opt.body = JSON.stringify(body);
    }
  }

  // return fetch Promise
  return fetch(url, opt)
    .then(res => {
      response.status = res.status;
      return res.json();
    })
    .then(body => {
      response.ok = response.status === 200;
      response.body = body;
      return response;
    })
    .catch(err => {
      response.status = response.status || (err.name === 'AbortError' ? 408 : 400);
      response.body =  err.message;
      return response;
    })
    .finally(() => {
      clearTimeout(timer);
    });

}
