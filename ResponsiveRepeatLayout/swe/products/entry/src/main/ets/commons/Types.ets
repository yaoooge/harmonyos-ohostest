import { MainMenuOption, SubMenuOption } from './Enums';

export interface TabListItem {
  label: string;
  icon: Resource;
  iconChecked: Resource;
  component: WrappedBuilder<[]>;
}

export interface MainMenuItem {
  type: MainMenuOption;
  icon: ResourceStr;
  label: string;
}

export interface SubMenuItem {
  type: SubMenuOption;
  icon: Resource;
  label: string;
}

export interface CategoryItem {
  id: string;
  label: string;
  iconUrl: ResourceStr;
  subCategory?: SubCategoryItem[];
}

export interface SubCategoryItem {
  id: string;
  label: string;
}

export interface ProductSummaryItem {
  banner: ResourceStr;
  title: string;
  subCategoryId: string;
  id: string;
}
