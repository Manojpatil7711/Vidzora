FROM node:26-bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1
ENV NODE_ENV=production
ENV PATH="/opt/venv/bin:/usr/local/bin:$PATH"

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-venv ffmpeg supervisor ca-certificates curl git \
    && rm -rf /var/lib/apt/lists/*

RUN python3 -m venv /opt/venv

RUN curl -fsSL https://dl.deno.land/release/v2.9.5/deno-x86_64-unknown-linux-gnu.zip -o /tmp/deno.zip \
    && unzip -q /tmp/deno.zip -d /usr/local/bin \
    && chmod +x /usr/local/bin/deno \
    && rm /tmp/deno.zip

RUN python -m pip install --no-cache-dir --upgrade pip \
    && python -m pip install --no-cache-dir yt-dlp yt-dlp-ejs bgutil-ytdlp-pot-provider

RUN git clone --depth 1 --branch 2.0.0 https://github.com/Brainicism/bgutil-ytdlp-pot-provider.git /opt/bgutil-provider \
    && cd /opt/bgutil-provider/server \
    && npm ci --omit=dev --no-audit --no-fund \
    && npm ci --no-audit --no-fund \
    && npx tsc

RUN useradd --create-home --uid 10001 --shell /usr/sbin/nologin vidzora \
    && mkdir -p /data/vidzora /app/youtube-worker /var/log/supervisor \
    && chown -R vidzora:vidzora /data/vidzora /app /opt/bgutil-provider /var/log/supervisor

COPY youtube-worker/requirements.txt /app/youtube-worker/requirements.txt
RUN /opt/venv/bin/pip install --no-cache-dir -r /app/youtube-worker/requirements.txt
COPY youtube-worker/app.py /app/youtube-worker/app.py
COPY youtube-worker/supervisord.conf /etc/supervisor/supervisord.conf

USER vidzora

WORKDIR /app/youtube-worker
EXPOSE 3000
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/supervisord.conf"]
