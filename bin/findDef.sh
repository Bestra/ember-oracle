
curl -s -G "localhost:5300/templates/definition" \
  --data-urlencode "name=$4" \
  --data-urlencode "column=$3" \
  --data-urlencode "line=$2" \
  --data-urlencode "path=$1" \
  --data-urlencode "format=compact"