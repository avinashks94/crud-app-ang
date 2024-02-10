import { Component } from '@angular/core';
import {
  StudentService,
  StudentResponse,
} from '../../Services/student.service';

@Component({
  selector: 'app-student-page',
  templateUrl: './student-page.component.html',
  styleUrl: './student-page.component.css',
})
export class StudentPageComponent {
  constructor(private studnetService: StudentService) {}
  students!: StudentResponse[];
  isLoading: boolean = false;
  ngOnInit() {
    this.getStudentLists();
  }
  getStudentLists() {
    this.isLoading = true;
    this.studnetService.getStudents().subscribe((res: any) => {
      this.students = res;
      // console.log(res);
      this.isLoading = false;
    });
  }

  deleteStudent(event: any, studentId: any) {
    if (confirm('Do you want to delete this data..?')) {
      event.target.innerText = 'Deleting...';
      this.studnetService.destroyStudent(studentId).subscribe((res: any) => {
        this.getStudentLists();
        alert(res.message);
      });
    }
  }
}
