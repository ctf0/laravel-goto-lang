# Laravel Goto Lang

## Features

- direct scroll to language key
- showing value on hover `laravel/tinker` must be installed

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
