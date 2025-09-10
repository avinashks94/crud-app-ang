import { Component } from '@angular/core';
import { StudentService } from '../../Services/student.service';
import { response } from 'express';
@Component({
  selector: 'app-student-create',
  templateUrl: './student-create.component.html',
  styleUrl: './student-create.component.css',
})
export class StudentCreateComponent {
  name!: string;
  course!: string;
  email!: string;
  phone!: string;

  isLoading: boolean = false;
  loadingTitle: string = 'Loading';
  errors: any = [];

  constructor(private studentService: StudentService) {}

  saveStudent() {
    this.isLoading = true;
    this.loadingTitle = 'Saving';
    let inputData = {
      name: this.name,
      course: this.course,
      email: this.email,
      phone: this.phone,
    };
    this.studentService.saveStudent(inputData).subscribe({
      next: (res: any) => {
        console.log(res, 'response');
        this.isLoading = false;

        // alert(res.message);
        alert('Data Saved');
        this.name = '';
        this.course = '';
        this.phone = '';
        this.email = '';
      },
      error: (err: any) => {
        this.errors = err.error.errors;
        this.isLoading = false;

        console.log(err.error.errors, 'errors');
      },
    });
  }
}
