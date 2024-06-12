// --- Types describing configuration object fresh out of parser
type ParsedConfigurationPrimitives = null | undefined | string | number;
export type ParsedConfigurationNonPrimitives =
  | ParsedConfigurationPrimitives
  | ParsedConfigurationPrimitives[]
  | Record<string, ParsedConfigurationPrimitives>;

// --- Types describing final configuration object
export type SectionSelector = string | Record<string, SectionSelector[]>;
export type ConfigSelector = ({ name?: string } & (
  | { first: string }
  | { all: string }
))[];
export type ConfigPage =
  | string
  | {
      url: string;
      selectors: ConfigSelector;
    };
export interface Configuration {
  output: string;
  toDevice?: {
    deviceEmail: string;
    senderEmail: string;
    senderPassword: string;
  };
  pages: ConfigPage[];
}
