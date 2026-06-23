import abilityTest from './Ability.test';
import homePagePassTest from './passtopass/HomePage.pass.test';
import categoryPagePassTest from './passtopass/CategoryPage.pass.test';
import cartPagePassTest from './passtopass/CartPage.pass.test';
import profilePagePassTest from './passtopass/ProfilePage.pass.test';
import homePageAdaptiveTest from './failtopass/HomePage.adaptive.test';
import categoryPageAdaptiveTest from './failtopass/CategoryPage.adaptive.test';
import cartPageAdaptiveTest from './failtopass/CartPage.adaptive.test';
import profilePageAdaptiveTest from './failtopass/ProfilePage.adaptive.test';

export default function testsuite() {
  abilityTest();
  homePagePassTest();
  categoryPagePassTest();
  cartPagePassTest();
  profilePagePassTest();
  homePageAdaptiveTest();
  categoryPageAdaptiveTest();
  cartPageAdaptiveTest();
  profilePageAdaptiveTest();
}
