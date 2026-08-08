const { parse } = require("@vue/compiler-sfc");
const fs = require("fs");
const content = fs.readFileSync("src/views/AdminView.vue", "utf-16le");
try {
  const result = parse(content.toString());
  if (result.errors.length) {
    result.errors.forEach(e => console.log(JSON.stringify(e, null, 2)));
  } else {
    console.log("No SFC errors");
  }
} catch(e) {
  console.log("Parse error:", e.message);
}
