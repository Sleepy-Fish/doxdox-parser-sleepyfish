const dox = require('dox');

/**
 * Format string as param.
 *
 * @example formatStringForParam('[optional param]');
 * @param {String} contents String to format.
 * @return {String} Formatted string.
 * @private
 */

const formatStringForParam = content =>
  content.toString().replace(/\[|\]/gu, '').split('=')[0];

/**
 * Format string as UID.
 *
 * @example formatStringForUID('example string');
 * @param {String} contents String to format.
 * @return {String} Formatted string.
 * @private
 */

const formatStringForUID = content =>
  content
    .toString()
    .toLowerCase()
    .replace(/[^\w.]+/gu, '-')
    .replace(/^-|-$/gu, '');

/**
 * Dox parser for doxdox.
 *
 * @example parser(content, 'index.js').then(methods => console.log(methods));
 * @param {String} content Contents of file.
 * @param {String} filename Name of file. Used to generate UIDs.
 * @return {Promise} Promise with methods parsed from contents.
 * @public
 */

const parser = (content, filename) => {
  let output = dox
    .parseComments(content, {
      raw: true,
      skipSingleStar: true
    })
    .filter(method => !method.ignore && method.ctx);

  const cls = output.filter(method => method.isClass)[0];
  const ctr = output.filter(method => method.isConstructor)[0];
  if (!cls && ctr) throw new Error(`Cannot have constructor dox without class dox in ${filename}`);
  let classMethod = null;
  if (cls) {
    classMethod = {
      uid: formatStringForUID(`${filename}-${cls.ctx.name}`),
      isAbstract: Boolean(cls.tags.filter(tag => tag.type === 'abstract').length),
      type: 'class',
      name: cls.ctx.name,
      description: cls.description.full,
      props: cls.tags
        .filter(tag => tag.type === 'property')
        .map(tag => ({
          name: tag.name,
          types: tag.types,
          description: tag.description
        }))
    };
    const ext = cls.tags.filter(tag => tag.type === 'extends')[0];
    if (ext) classMethod.extends = ext.otherClass;
    if (ctr) {
      Object.assign(classMethod, {
        display: `${cls.ctx.name}(${ctr.tags
          .filter(tag => tag.type === 'param' && !tag.name.match(/\./u))
          .map(tag => {
            if (tag.optional) return `[${formatStringForParam(tag.name)}]`;
            return formatStringForParam(tag.name);
          })
          .join(', ')
          .replace(/\], \[/gu, ', ')
          .replace(', [', '[, ')
          })`,
        params: ctr.tags
          .filter(tag => tag.type === 'param' && !tag.name.match(/\./u))
          .map(tag => {
            const paramTag = {
              name: formatStringForParam(tag.name),
              isOptional: tag.optional,
              types: tag.types,
              description: tag.description
            };
            if (tag.optional) paramTag.default = tag.name.toString().replace(/\[|\]/gu, '').split('=')[1];
            return paramTag;
          })
      });
      for (const param of classMethod.params) {
        if (param.types.filter(type => type.toLowerCase() === 'object').length) {
          param.props = ctr.tags
            .filter(tag => tag.type === 'param' && tag.name.match(new RegExp(`${param.name}\\.`, 'u')))
            .map(tag => {
              const paramTag = {
                name: formatStringForParam(tag.name).split('.')[1],
                isOptional: tag.optional,
                types: tag.types,
                description: tag.description
              };
              if (tag.optional) paramTag.default = tag.name.toString().replace(/\[|\]/gu, '').split('=')[1];
              return paramTag;
            });
        }
      }
    }
  }

  output = output
    .filter(method => !method.isClass || !method.isConstructor)
    .map(method => ({
      uid: formatStringForUID(`${filename}-${method.ctx.name}`),
      isPrivate: method.isPrivate,
      type: method.ctx.type,
      name: method.ctx.name,
      description: method.description.full,
      empty: !method.description.full && !method.tags.length,
      params: method.tags
        .filter(tag => tag.type === 'param' && !tag.name.match(/\./u))
        .map(tag => {
          if (tag.optional) {
            return `[${formatStringForParam(tag.name)}]`;
          }
          return formatStringForParam(tag.name);
        })
        .join(', ')
        .replace(/\], \[/gu, ', ')
        .replace(', [', '[, '),
      tags: {
        example: method.tags
          .filter(tag => tag.type === 'example')
          .map(tag => tag.string),
        param: method.tags
          .filter(tag => tag.type === 'param')
          .map(tag => ({
            name: formatStringForParam(tag.name),
            isOptional: tag.optional,
            types: tag.types,
            description: tag.description
          })),
        property: method.tags
          .filter(tag => tag.type === 'property')
          .map(tag => ({
            name: tag.name,
            types: tag.types,
            description: tag.description
          })),
        extends: method.tags
          .filter(tag => tag.type === 'extends' || tag.type === 'augments')
          .map(tag => ({
            type: tag.type,
            class: tag.otherClass
          })),
        return: method.tags
          .filter(tag => tag.type === 'return' || tag.type === 'returns')
          .map(tag => ({
            types: tag.types,
            description: tag.description
          }))
      }
    }))
    .filter(method => !method.empty);
  if (classMethod) output.unshift(classMethod);
  return output;
};

module.exports = parser;
