import type HtmlRspackPlugin from '../typings';

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
type Assert<T extends true> = T;

type Options = HtmlRspackPlugin.Options;
type ProcessedOptions = HtmlRspackPlugin.ProcessedOptions;

export type ProcessedOptionsAssertions = [
  Assert<Equal<ProcessedOptions['title'], string>>,
  Assert<Equal<ProcessedOptions['chunks'], 'all' | string[]>>,
  Assert<Equal<ProcessedOptions['excludeChunks'], string[]>>,
  Assert<Equal<ProcessedOptions['cache'], boolean>>,
  Assert<Equal<Pick<ProcessedOptions, 'minify'>, Pick<Options, 'minify'>>>,
  Assert<Equal<ProcessedOptions['customTemplateParameter'], any>>,
];
