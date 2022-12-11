SRCS = manifest.json background/* content_scripts/* lib/* options/* res/* vendor/*

OUTPUT_DIR = dist/
OUTPUT = $(OUTPUT_DIR)/package.zip

.PHONY: default clean new chrome ff

default: $(OUTPUT)

clean:
	rm -r $(OUTPUT_DIR)

new: clean default

$(OUTPUT): $(SRCS)
	mkdir -p $(OUTPUT_DIR)
	zip -r $(OUTPUT) $(SRCS)

chrome:
	chmod +w manifest.json || true
	./merge_json.py manifest_common.json manifest_chrome.json > manifest.json
	chmod -w manifest.json

ff:
	chmod +w manifest.json || true
	./merge_json.py manifest_common.json manifest_ff.json > manifest.json
	chmod -w manifest.json
