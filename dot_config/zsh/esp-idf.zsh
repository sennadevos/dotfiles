# Auto-load the ESP-IDF environment when inside the esp-idf distrobox.
# distrobox sets $CONTAINER_ID to the box name.
if [[ "$CONTAINER_ID" == "esp-idf" && -f /opt/esp/idf/export.sh ]]; then
  . /opt/esp/idf/export.sh >/dev/null
fi
