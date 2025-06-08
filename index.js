addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

function parseURL(url) {
  // 例: https://your-worker.workers.dev/https://www.google.com
  let path = url.indexOf('/', 8) !== -1 ? url.substr(url.indexOf('/', 8)) : '';
  let real_url = decodeURIComponent(path.substr(1)); // 去掉第一个 /
  return {
    url: real_url,
    headers: {},
  }
}

async function handleRequest(request) {
  if (request.method === "OPTIONS") {
    return new Response("", {
      status: 200,
      headers: {
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "*",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Max-Age": "31536000",
        "X-Request-Type": "CORS Preflight"
      }
    });
  }

  let reqHeaders = new Headers(request.headers);
  let outBody, outStatus = 200, outCt = null, outHeaders = new Headers({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": reqHeaders.get('Access-Control-Allow-Headers') || "Accept, Authorization, Cache-Control, Content-Type, DNT, If-Modified-Since, Keep-Alive, Origin, User-Agent, X-Requested-With",
    "Access-Control-Allow-Credentials": "true"
  });

  try {
    let t = parseURL(request.url)
    let url = t.url

    if (url.length < 3 || url.indexOf('.') === -1) {
      throw "invalid URL input: " + url;
    } else if (url === "favicon.ico" || url === "robots.txt") {
      return Response.redirect('https://workers.cloudflare.com', 307)
    } else {
      let fp = {
        method: request.method,
        headers: {}
      }
      // 复制原始请求头
      for (let [k, v] of reqHeaders.entries()) {
        if (!['content-length', 'content-type'].includes(k.toLowerCase())) {
          fp.headers[k] = v;
        }
      }

      // 处理请求体
      if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) {
        const ct = (reqHeaders.get('content-type') || "").toLowerCase();
        if (ct.includes('application/json')) {
          fp.body = JSON.stringify(await request.json());
        } else if (ct.includes('application/text') || ct.includes('text/html')) {
          fp.body = await request.text();
        } else if (ct.includes('form')) {
          fp.body = await request.formData();
        } else {
          fp.body = await request.blob();
        }
      }

      let fr = await fetch(url, fp);
      outStatus = fr.status;
      outCt = fr.headers.get('content-type');
      outBody = fr.body;
    }
  } catch (err) {
    outStatus = 500
    outCt = "application/json";
    outBody = JSON.stringify({
      code: -1,
      msg: (err && err.stack) ? String(err.stack) : String(err)
    });
  }

  if (outCt && outCt !== "") {
    outHeaders.set("content-type", outCt);
  }

  return new Response(outBody, {
    status: outStatus,
    headers: outHeaders
  })
}
