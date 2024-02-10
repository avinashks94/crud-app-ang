import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomePageComponent } from './Pages/home-page/home-page.component';
import { AboutPageComponent } from './Pages/about-page/about-page.component';
import { ContactPageComponent } from './Pages/contact-page/contact-page.component';
import { StudentCreateComponent } from './Pages/student-create/student-create.component';
import { StudentPageComponent } from './Pages/student-page/student-page.component';
import { StudentEditComponent } from './Pages/student-edit/student-edit.component';

const routes: Routes = [
  { path: '', component: HomePageComponent, title: 'Home Page' },
  { path: 'about-us', component: AboutPageComponent, title: 'About Us' },
  { path: 'contact-us', component: ContactPageComponent, title: 'Contact US' },
  {
    path: 'student/create',
    component: StudentCreateComponent,
    title: 'Student Create',
  },
  {
    path: 'students',
    component: StudentPageComponent,
    title: 'Student Create',
  },
  {
    path: 'student/:id',
    component: StudentEditComponent,
    title: 'Student Edit',
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
