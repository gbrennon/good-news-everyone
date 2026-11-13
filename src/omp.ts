import { DefaultExtension } from "./default_extension";

const ompExtension = new DefaultExtension("omp");

export default ompExtension.register.bind(ompExtension);
