export default {
  async fetch(request) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json"
    };

    // Handle preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return new Response(
        JSON.stringify({ error: "Parameter ID tidak ditemukan" }),
        { headers: corsHeaders }
      );
    }

    const targetUrl = `https://ok.ru/videoembed/${id}`;
    const randomUserAgent =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";

    try {
      const response = await fetch(targetUrl, {
        headers: {
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
          "Connection": "keep-alive",
          "Upgrade-Insecure-Requests": "1",
          "Referer": "https://ok.ru/",
          "User-Agent": randomUserAgent,
          "X-Forwarded-For": request.headers.get("CF-Connecting-IP") || "1.1.1.1",
        },
      });

      if (!response.ok) {
        return new Response(
          JSON.stringify({ error: `Gagal mengambil halaman, status code: ${response.status}` }),
          { headers: corsHeaders }
        );
      }

      const html = await response.text();

      const match = html.match(/data-module="OKVideo"[^>]*data-options="([^"]+)"/);
      if (!match) {
        return new Response(
          JSON.stringify({ error: "Elemen OKVideo tidak ditemukan" }),
          { headers: corsHeaders }
        );
      }

      const dataOptions = decodeURIComponent(match[1].replace(/&quot;/g, '"'));
      let data;

      try {
        data = JSON.parse(dataOptions);
      } catch {
        return new Response(
          JSON.stringify({ error: "Gagal decode data-options" }),
          { headers: corsHeaders }
        );
      }

      if (data?.flashvars?.metadata) {
        try {
          const metadata = JSON.parse(data.flashvars.metadata);
          return new Response(
            JSON.stringify(metadata, null, 2),
            { headers: corsHeaders }
          );
        } catch {
          return new Response(
            JSON.stringify({ error: "Metadata tidak bisa didecode" }),
            { headers: corsHeaders }
          );
        }
      } else {
        return new Response(
          JSON.stringify({ error: "Metadata tidak ditemukan" }),
          { headers: corsHeaders }
        );
      }

    } catch (err) {
      return new Response(
        JSON.stringify({ error: "Terjadi kesalahan: " + err.message }),
        { headers: corsHeaders }
      );
    }
  },
};
