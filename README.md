# Laravel Goto Lang

## Features

- direct scroll to language key
- showing value on hover `laravel/tinker` must be installed

### laravel-modules

i recently started using [laravel-modules](https://nwidart.com/laravel-modules/v6/installation-and-setup) & manual navigation is just impossible,

so for the package to work correctly, make sure u r following the nameing convention of `Pascal > Snake` ex.

> + `module namespace` > `MyDashboard`
> + `view namespace` > `my_dashboard`

### Limitations

- similar nested keys wont behave as expected, ex.

    ```php
    // messages.php
    [
        'one' => [
            'two' => [
                'three' => 'some value'
            ]
        ],
        'two' => [
            'three' => 'some value'
        ]
    ];
    ```

    - `trans('messages.one.two.three)` will match correctly
    - `trans('messages.two.three)` will match the keys under **one.two.three**
