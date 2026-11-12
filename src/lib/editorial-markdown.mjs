export function editorialMarkdown() {
  return (tree, file) => {
    const path = file.path?.replaceAll('\\', '/') ?? '';
    if (!/\/content\/(?:casos|textos)\//.test(path)) return;
    function includesUnsupportedNode(node) {
      return ['html', 'image', 'imageReference'].includes(node.type)
        || Boolean(node.children?.some(includesUnsupportedNode));
    }
    if (includesUnsupportedNode(tree)) {
      file.data.astro.frontmatter.bindingInvalidMarkdown = true;
    }
  };
}

