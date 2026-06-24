import commonPassToPassTest from './CommonPassToPass.test';
import smPassToPassTest from './SmPassToPass.test';
import mdPassToPassTest from './MdPassToPass.test';
import mdFailToPassTest from './MdFailToPass.test';
import lgFailToPassTest from './LgFailToPass.test';

export default function testsuite() {
  commonPassToPassTest();
  smPassToPassTest();
  mdPassToPassTest();
  mdFailToPassTest();
  lgFailToPassTest();
}
