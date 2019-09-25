import { complement, isEmpty } from "ramda";

export const isNotEmpty = complement(isEmpty);
