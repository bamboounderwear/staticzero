const fs = require('fs');
const path = require('path');

// Parse front matter and return an object with frontMatter and body content.
function parseFrontMatter(content) {
  const fmRegex = /^---\n([\s\S]+?)\n---/;
  const match = content.match(fmRegex);
  let frontMatter = {};
  let body = content;
  if (match) {
    const fmContent = match[1];
    fmContent.split('\n').forEach(line => {
      const [key, ...rest] = line.split(':');
      if (key && rest) {
        frontMatter[key.trim()] = rest.join(':').trim();
      }
    });
    body = content.replace(fmRegex, '').trim();
  }
  return { frontMatter, body };
}

// Load the specified template from the /templates folder.
function loadTemplate(templateName) {
  const templatePath = path.join(__dirname, 'templates', templateName);
  if (fs.existsSync(templatePath)) {
    return fs.readFileSync(templatePath, 'utf8');
  } else {
    console.error(`Template ${templateName} not found.`);
    process.exit(1);
  }
}

// Replace custom component tags with the content from the /components folder.
function processComponents(htmlContent) {
  return htmlContent.replace(/<component\s+src="([^"]+)"\s*><\/component>/g, (match, comp) => {
    const compPath = path.join(__dirname, 'components', comp);
    if (fs.existsSync(compPath)) {
      return fs.readFileSync(compPath, 'utf8');
    } else {
      console.warn(`Component ${comp} not found.`);
      return '';
    }
  });
}

// Generate a complete page by applying the template and injecting content.
function generatePage(filePath) {
  const rawContent = fs.readFileSync(filePath, 'utf8');
  const { frontMatter, body } = parseFrontMatter(rawContent);

  // Use frontMatter.template if specified; otherwise default to page.html.
  const templateName = frontMatter.template || 'page.html';
  let templateContent = loadTemplate(templateName);

  // Insert the page content.
  templateContent = templateContent.replace(/{{\s*content\s*}}/g, body);

  // Replace placeholders in the template with frontMatter values.
  for (let key in frontMatter) {
    if (key === 'template') continue;
    const regex = new RegExp('{{\\s*' + key + '\\s*}}', 'g');
    templateContent = templateContent.replace(regex, frontMatter[key]);
  }

  // Process custom components.
  templateContent = processComponents(templateContent);

  return templateContent;
}

// Build the entire site by processing files in the /pages folder.
function buildSite() {
  const pagesDir = path.join(__dirname, 'pages');
  // Change output directory from "dist" to "public" to align with common conventions.
  const outputDir = path.join(__dirname, 'public');
  fs.mkdirSync(outputDir, { recursive: true });

  // Recursively process directories.
  function processDirectory(dir, outDir) {
    fs.readdirSync(dir, { withFileTypes: true }).forEach(item => {
      const fullPath = path.join(dir, item.name);
      const outPath = path.join(outDir, item.name);
      if (item.isDirectory()) {
        fs.mkdirSync(outPath, { recursive: true });
        processDirectory(fullPath, outPath);
      } else if (item.isFile() && path.extname(item.name) === '.html') {
        const pageContent = generatePage(fullPath);
        fs.writeFileSync(outPath, pageContent, 'utf8');
        console.log(`Generated: ${outPath}`);
      }
    });
  }

  processDirectory(pagesDir, outputDir);
  console.log('Site build complete. Output directory:', outputDir);
}

buildSite();
