import commonPassToPassTest from './CommonPassToPass.test';
import smPassToPassTest from './SmPassToPass.test';
import mdFailToPassTest from './MdFailToPass.test';
import lgFailToPassTest from './LgFailToPass.test';

export default function testsuite() {
  commonPassToPassTest();
  smPassToPassTest();
  mdFailToPassTest();
  lgFailToPassTest();
}
