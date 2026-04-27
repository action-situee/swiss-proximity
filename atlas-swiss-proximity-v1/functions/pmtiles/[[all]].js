export async function onRequestGet(ctx) {
  const path = new URL(ctx.request.url).pathname.replace("/pmtiles/", "");
  const file = await ctx.env.MEDIA.get(path);
  if (!file) return new Response(null, { status: 404 });

  const range = ctx.request.headers.get("range");

  if (range) {
    // Parse range header (format: "bytes=start-end")
    const rangeMatch = range.match(/bytes=(\d+)-(\d*)/);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1], 10);
      const end = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : file.size - 1;

      // Get the file with range options
      const rangedFile = await ctx.env.MEDIA.get(path, {
        range: { offset: start, length: end - start + 1 },
      });

      if (!rangedFile) return new Response(null, { status: 416 });

      return new Response(rangedFile.body, {
        status: 206,
        headers: {
          "Content-Type": file.httpMetadata.contentType,
          "Content-Range": `bytes ${start}-${end}/${file.size}`,
          "Content-Length": (end - start + 1).toString(),
          "Accept-Ranges": "bytes",
        },
      });
    }
  }

  // Fallback for non-range requests
  return new Response(file.body, {
    headers: {
      "Content-Type": file.httpMetadata.contentType,
      "Accept-Ranges": "bytes",
    },
  });
}
