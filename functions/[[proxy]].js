export async function onRequest(context) {
  const proxyIP = "http://123.123.123.123"; // 修改为你自己的代理IP
  const url = new URL(context.request.url);
  const targetURL = url.pathname.slice(1); // 去除开头的 /

  if (!targetURL || !targetURL.startsWith("http")) {
    return new Response("Invalid target URL", { status: 400 });
  }

  const decodedURL = decodeURIComponent(targetURL);
  const init = {
    method: context.request.method,
    headers: context.request.headers,
    redirect: "follow",
  };

  if (!["GET", "HEAD"].includes(context.request.method)) {
    init.body = await context.request.text();
  }

  try {
    const response = await fetch(decodedURL, init);
    if (response.status >= 400 && proxyIP) {
      const fallbackURL = `${proxyIP}/${decodedURL}`;
      return fetch(fallbackURL, init);
    }
    return response;
  } catch (e) {
    if (proxyIP) {
      const fallbackURL = `${proxyIP}/${decodedURL}`;
      try {
        return await fetch(fallbackURL, init);
      } catch (err) {
        return new Response("Both main and fallback failed: " + err.message, { status: 502 });
      }
    }
    return new Response("Main fetch failed: " + e.message, { status: 502 });
  }
}
