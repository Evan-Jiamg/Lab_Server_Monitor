import os

SERVER_HOST    = os.environ.get("SERVER_HOST", "140.113.73.82")
SERVER_PORT    = int(os.environ.get("SERVER_PORT", "22"))
HISTORY_LEN    = 60   # data points per metric (1 per poll)
POLL_INTERVAL  = 30   # seconds between background polls
